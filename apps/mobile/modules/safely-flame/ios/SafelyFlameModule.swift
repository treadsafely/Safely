import ExpoModulesCore
import FlameWallet

private struct FlameFailure: Error {
    let code: String
    let reason: String

    init(code: String, reason: String) {
        self.code = code
        self.reason = reason
    }

    init(_ error: Error) {
        switch error {
        case let error as FlameFailure:
            self = error
        case let error as FlameError:
            self.init(flameError: error)
        default:
            self.init(code: "ERR_FLAME_INTERNAL", reason: String(describing: type(of: error)))
        }
    }

    // No `default` on purpose: a case added by a library update must fail the build here.
    private init(flameError: FlameError) {
        switch flameError {
        case .InvalidMnemonic(let reason):
            self.init(code: "ERR_FLAME_INVALID_MNEMONIC", reason: reason)
        case .InvalidSeed(let reason):
            self.init(code: "ERR_FLAME_INVALID_SEED", reason: reason)
        case .InvalidKey(let reason):
            self.init(code: "ERR_FLAME_INVALID_KEY", reason: reason)
        case .NotPermitted(let wallet, let needs):
            self.init(code: "ERR_FLAME_NOT_PERMITTED", reason: "\(wallet) wallet, needs \(needs)")
        case .InvalidAddress(let reason):
            self.init(code: "ERR_FLAME_INVALID_ADDRESS", reason: reason)
        case .InvalidKeyPath(let reason):
            self.init(code: "ERR_FLAME_INVALID_KEY_PATH", reason: reason)
        case .InvalidBytes(let what, let reason):
            self.init(code: "ERR_FLAME_INVALID_BYTES", reason: "\(what): \(reason)")
        case .KeyMismatch(let input):
            self.init(code: "ERR_FLAME_KEY_MISMATCH", reason: "input \(input)")
        case .Note(let failure, let reason):
            self.init(code: "ERR_FLAME_NOTE", reason: "\(failure): \(reason)")
        case .Transfer(let reason):
            self.init(code: "ERR_FLAME_TRANSFER", reason: reason)
        }
    }
}

private func invalidArgument(_ reason: String) -> FlameFailure {
    FlameFailure(code: "ERR_FLAME_INVALID_ARGUMENT", reason: reason)
}

private func network(_ value: String) throws -> Network {
    switch value {
    case "mainnet": return .mainnet
    case "testnet": return .testnet
    default: throw invalidArgument("unknown network \(value)")
    }
}

// Expo converts a JS number with a trapping `init`, so out-of-range values must arrive as `Int`.
private func uint32(_ value: Int) throws -> UInt32 {
    guard let result = UInt32(exactly: value) else {
        throw invalidArgument("\(value) is not a uint32")
    }
    return result
}

private func noteFailure(_ failure: NoteFailure) -> String {
    switch failure {
    case .missing: return "missing"
    case .malformed: return "malformed"
    case .unknownVersion: return "unknownVersion"
    case .undecryptable: return "undecryptable"
    case .openingMismatch: return "openingMismatch"
    case .notConfidential: return "notConfidential"
    }
}

// u64 amounts cross the bridge as decimal strings: a JS number loses precision above 2^53.
private func contractValue(_ value: ContractValue) -> [String: Any] {
    switch value {
    case .clear(let qty, let flavor): return ["type": "clear", "qty": String(qty), "flavor": flavor]
    case .confidential: return ["type": "confidential"]
    case .other: return ["type": "other"]
    }
}

private func failureFields(_ error: Error, _ fields: [String: Any]) -> [String: Any] {
    let failure = FlameFailure(error)
    return fields.merging(["code": failure.code, "reason": failure.reason]) { _, new in new }
}

private func outcome(_ body: () throws -> Any) -> [String: Any] {
    do {
        return ["ok": true, "value": try body()]
    } catch {
        return failureFields(error, ["ok": false])
    }
}

public class SafelyFlameModule: Module {
    public func definition() -> ModuleDefinition {
        Name("SafelyFlame")

        AsyncFunction("viewKey") { (seed: Data, networkName: String) -> [String: Any] in
            outcome {
                try Wallet(seed: seed, network: network(networkName), nextIndex: 0).viewKey()
            }
        }

        AsyncFunction("address") { (viewKey: String, networkName: String, branch: Int, index: Int) -> [String: Any] in
            outcome {
                let wallet = try Wallet.fromViewKey(viewKey: viewKey, network: network(networkName), nextIndex: 0)
                let issued = try wallet.address(path: KeyPath(branch: uint32(branch), index: uint32(index)))
                return ["address": issued.address, "predicate": issued.predicate]
            }
        }

        AsyncFunction("decodeContracts") { (contracts: [Data]) -> [String: Any] in
            outcome {
                contracts.map { contract -> [String: Any] in
                    do {
                        let info = try FlameWallet.decodeContract(bytes: contract)
                        return ["decoded": true, "id": info.id, "predicate": info.predicate, "value": contractValue(info.value)]
                    } catch {
                        return failureFields(error, ["decoded": false])
                    }
                }
            }
        }

        // An empty note stands for "the scan served none": the bridge has no optional array elements.
        AsyncFunction("openNotes") { (viewKey: String, networkName: String, branch: Int, index: Int, contracts: [Data], notes: [Data]) -> [String: Any] in
            outcome {
                guard contracts.count == notes.count else {
                    throw invalidArgument("\(contracts.count) contracts for \(notes.count) notes")
                }
                let wallet = try Wallet.fromViewKey(viewKey: viewKey, network: network(networkName), nextIndex: 0)
                let path = KeyPath(branch: try uint32(branch), index: try uint32(index))
                return zip(contracts, notes).map { contract, note -> [String: Any] in
                    do {
                        let received = try wallet.openNote(contract: contract, note: note.isEmpty ? nil : note, path: path)
                        return [
                            "opened": true,
                            "qty": String(received.opening.qty),
                            "flavor": received.opening.flavor,
                            "memo": received.memo
                        ]
                    } catch FlameError.Note(let failure, _) {
                        return ["opened": false, "failure": noteFailure(failure)]
                    } catch {
                        return failureFields(error, ["opened": false, "failure": "error"])
                    }
                }
            }
        }
    }
}
