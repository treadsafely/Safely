import ExpoModulesCore

internal final class AppGroupUnavailableException: Exception {
    override var reason: String {
        "App Group container \(PushContentCore.appGroupId) is not available"
    }
}

// Writes the `target_ref -> wallet name` dictionary into the App Group container
// so the Notification Service Extension (same PushContentCore, other process)
// can substitute {{wallet_name}} before a push is shown. JS never touches the
// file or its format.
public class SafelyPushContentModule: Module {
    public func definition() -> ModuleDefinition {
        Name("SafelyPushContent")

        AsyncFunction("setWalletNames") { (names: [String: String]) in
            guard let container = FileManager.default.containerURL(
                forSecurityApplicationGroupIdentifier: PushContentCore.appGroupId
            ) else {
                throw AppGroupUnavailableException()
            }
            try PushContentCore.save(walletNames: names, to: PushContentCore.walletNamesURL(in: container))
        }
    }
}
