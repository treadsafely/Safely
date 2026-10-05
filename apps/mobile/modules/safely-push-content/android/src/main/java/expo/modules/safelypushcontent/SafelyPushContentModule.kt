package expo.modules.safelypushcontent

import android.content.Context
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

internal fun walletNamesFile(context: Context): File =
    File(context.noBackupFilesDir, WALLET_NAMES_FILE_NAME)

// Writes the `target_ref -> wallet name` dictionary that SafelyNotificationsService
// reads before a push is displayed. JS never touches the file or its format.
class SafelyPushContentModule : Module() {
    private val context: Context
        get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

    override fun definition() = ModuleDefinition {
        Name("SafelyPushContent")

        AsyncFunction("setWalletNames") { names: Map<String, String> ->
            WalletNameStore(walletNamesFile(context)).save(names)
        }
    }
}
