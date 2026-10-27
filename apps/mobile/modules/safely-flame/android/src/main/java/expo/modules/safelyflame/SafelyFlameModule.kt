package expo.modules.safelyflame

import com.flame.wallet.ContractValue
import com.flame.wallet.FlameException
import com.flame.wallet.KeyPath
import com.flame.wallet.Network
import com.flame.wallet.NoteFailure
import com.flame.wallet.TransferInput
import com.flame.wallet.TransferOutput
import com.flame.wallet.TransferRequest
import com.flame.wallet.Wallet
import com.flame.wallet.decodeContract
import com.flame.wallet.memoMaxBytes
import com.flame.wallet.validateReceivingAddress
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

private class FlameFailure(val code: String, val reason: String) : Exception(reason)

private fun invalidArgument(reason: String) = FlameFailure("ERR_FLAME_INVALID_ARGUMENT", reason)

private fun toFailure(error: Throwable): FlameFailure = when (error) {
    is FlameFailure -> error
    is FlameException -> fromFlame(error)
    else -> FlameFailure("ERR_FLAME_INTERNAL", error.javaClass.simpleName)
}

// No `else` on purpose: a subclass added by a library update must fail the build here.
private fun fromFlame(error: FlameException): FlameFailure = when (error) {
    is FlameException.InvalidMnemonic -> FlameFailure("ERR_FLAME_INVALID_MNEMONIC", error.reason)
    is FlameException.InvalidSeed -> FlameFailure("ERR_FLAME_INVALID_SEED", error.reason)
    is FlameException.InvalidKey -> FlameFailure("ERR_FLAME_INVALID_KEY", error.reason)
    is FlameException.NotPermitted -> FlameFailure("ERR_FLAME_NOT_PERMITTED", "${error.wallet} wallet, needs ${error.needs}")
    is FlameException.InvalidAddress -> FlameFailure("ERR_FLAME_INVALID_ADDRESS", error.reason)
    is FlameException.InvalidKeyPath -> FlameFailure("ERR_FLAME_INVALID_KEY_PATH", error.reason)
    is FlameException.InvalidBytes -> FlameFailure("ERR_FLAME_INVALID_BYTES", "${error.what}: ${error.reason}")
    is FlameException.KeyMismatch -> FlameFailure("ERR_FLAME_KEY_MISMATCH", "input ${error.input}")
    is FlameException.Note -> FlameFailure("ERR_FLAME_NOTE", "${error.failure}: ${error.reason}")
    is FlameException.Transfer -> FlameFailure("ERR_FLAME_TRANSFER", error.reason)
}

private fun network(value: String): Network = when (value) {
    "mainnet" -> Network.MAINNET
    "testnet" -> Network.TESTNET
    else -> throw invalidArgument("unknown network $value")
}

private fun uint32(value: Long): UInt {
    if (value !in 0..UInt.MAX_VALUE.toLong()) throw invalidArgument("$value is not a uint32")
    return value.toUInt()
}

// u64 amounts arrive as decimal strings for the same reason they leave as strings.
private fun uint64(value: String): ULong =
    value.toULongOrNull() ?: throw invalidArgument("$value is not a uint64")

class TransferPlan : Record {
    @Field val addresses: List<String> = emptyList()
    @Field val qtys: List<String> = emptyList()
    @Field val memos: List<ByteArray> = emptyList()
    @Field val fee: String = ""
    @Field val gas: String = ""
}

private fun noteFailure(failure: NoteFailure): String = when (failure) {
    NoteFailure.MISSING -> "missing"
    NoteFailure.MALFORMED -> "malformed"
    NoteFailure.UNKNOWN_VERSION -> "unknownVersion"
    NoteFailure.UNDECRYPTABLE -> "undecryptable"
    NoteFailure.OPENING_MISMATCH -> "openingMismatch"
    NoteFailure.NOT_CONFIDENTIAL -> "notConfidential"
}

// u64 amounts cross the bridge as decimal strings: a JS number loses precision above 2^53.
private fun contractValue(value: ContractValue): Map<String, Any> = when (value) {
    is ContractValue.Clear -> mapOf("type" to "clear", "qty" to value.qty.toString(), "flavor" to value.flavor, "isNative" to value.isNative)
    is ContractValue.Confidential -> mapOf("type" to "confidential")
    is ContractValue.Other -> mapOf("type" to "other")
}

private fun failureFields(error: Throwable): Map<String, Any> {
    val failure = toFailure(error)
    return mapOf("code" to failure.code, "reason" to failure.reason)
}

private inline fun outcome(block: () -> Any): Map<String, Any> = try {
    mapOf("ok" to true, "value" to block())
} catch (error: Throwable) {
    failureFields(error) + ("ok" to false)
}

class SafelyFlameModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("SafelyFlame")

        AsyncFunction("viewKey") { seed: ByteArray, networkName: String ->
            outcome {
                try {
                    Wallet(seed, network(networkName), 0u).use { wallet -> wallet.viewKey() }
                } finally {
                    seed.fill(0)
                }
            }
        }

        AsyncFunction("address") { viewKey: String, networkName: String, branch: Long, index: Long ->
            outcome {
                Wallet.fromViewKey(viewKey, network(networkName), 0u).use { wallet ->
                    val issued = wallet.address(KeyPath(uint32(branch), uint32(index)))
                    mapOf(
                        "receivingAddress" to issued.receivingAddress,
                        "trackingAddress" to issued.trackingAddress,
                        "predicate" to issued.predicate
                    )
                }
            }
        }

        Function("validateReceivingAddress") { address: String, networkName: String ->
            outcome { validateReceivingAddress(address, network(networkName)) }
        }

        Function("memoMaxBytes") {
            memoMaxBytes().toLong()
        }

        AsyncFunction("decodeContracts") { contracts: List<ByteArray> ->
            outcome {
                contracts.map { contract ->
                    try {
                        val info = decodeContract(contract)
                        mapOf("decoded" to true, "id" to info.id, "predicate" to info.predicate, "value" to contractValue(info.value))
                    } catch (error: Throwable) {
                        failureFields(error) + ("decoded" to false)
                    }
                }
            }
        }

        // A confidential input is opened here, so its blindings never cross the bridge.
        AsyncFunction("buildTransfer") { seed: ByteArray, networkName: String, branch: Long, index: Long, contracts: List<ByteArray>, notes: List<ByteArray>, proofs: List<ByteArray>, plan: TransferPlan ->
            outcome {
                try {
                    if (contracts.size != notes.size || contracts.size != proofs.size) {
                        throw invalidArgument("${contracts.size} contracts for ${notes.size} notes and ${proofs.size} proofs")
                    }
                    if (plan.addresses.size != plan.qtys.size || plan.addresses.size != plan.memos.size) {
                        throw invalidArgument("${plan.addresses.size} addresses for ${plan.qtys.size} amounts and ${plan.memos.size} memos")
                    }
                    val path = KeyPath(uint32(branch), uint32(index))
                    Wallet(seed, network(networkName), 0u).use { wallet ->
                        val inputs = contracts.indices.map { i ->
                            val opening = if (decodeContract(contracts[i]).value is ContractValue.Confidential) {
                                wallet.openNote(contracts[i], notes[i].takeIf { it.isNotEmpty() }, path).opening
                            } else {
                                null
                            }
                            TransferInput(contracts[i], proofs[i], path, opening)
                        }
                        val outputs = plan.addresses.indices.map { i ->
                            TransferOutput(plan.addresses[i], uint64(plan.qtys[i]), null, plan.memos[i])
                        }
                        val transfer = wallet.buildTransfer(
                            TransferRequest(inputs, outputs, uint64(plan.fee), uint64(plan.gas), 0u)
                        )
                        mapOf("txid" to transfer.txid, "blockTx" to transfer.blockTx)
                    }
                } finally {
                    seed.fill(0)
                }
            }
        }

        // An empty note stands for "the scan served none": the bridge has no optional list elements.
        AsyncFunction("openNotes") { viewKey: String, networkName: String, branch: Long, index: Long, contracts: List<ByteArray>, notes: List<ByteArray> ->
            outcome {
                if (contracts.size != notes.size) throw invalidArgument("${contracts.size} contracts for ${notes.size} notes")
                val path = KeyPath(uint32(branch), uint32(index))
                Wallet.fromViewKey(viewKey, network(networkName), 0u).use { wallet ->
                    contracts.zip(notes).map { (contract, note) ->
                        try {
                            val received = wallet.openNote(contract, note.takeIf { it.isNotEmpty() }, path)
                            mapOf(
                                "opened" to true,
                                "qty" to received.opening.qty.toString(),
                                "flavor" to received.opening.flavor,
                                "isNative" to received.isNative,
                                "memo" to received.memo
                            )
                        } catch (error: FlameException.Note) {
                            mapOf("opened" to false, "failure" to noteFailure(error.failure))
                        } catch (error: Throwable) {
                            failureFields(error) + mapOf("opened" to false, "failure" to "error")
                        }
                    }
                }
            }
        }
    }
}
