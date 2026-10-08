import UserNotifications

// Notification Service Extension: runs before iOS shows a push that carries
// `mutable-content`. Substitutes {{wallet_name}} from the App Group dictionary
// written by the app; on any failure the original title/body are shown.
final class NotificationService: UNNotificationServiceExtension {
    private var contentHandler: ((UNNotificationContent) -> Void)?
    private var bestAttempt: UNMutableNotificationContent?

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        self.contentHandler = contentHandler
        guard let content = request.content.mutableCopy() as? UNMutableNotificationContent else {
            contentHandler(request.content)
            return
        }
        bestAttempt = content

        let data = (request.content.userInfo["body"] as? [String: Any]) ?? [:]
        if let container = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: PushContentCore.appGroupId
        ) {
            let names = PushContentCore.loadWalletNames(from: PushContentCore.walletNamesURL(in: container))
            if let rewritten = PushContentCore.rewrite(
                title: content.title,
                body: content.body,
                data: data,
                walletNames: names
            ) {
                content.title = rewritten.title
                content.body = rewritten.body
            }
        }

        contentHandler(content)
    }

    override func serviceExtensionTimeWillExpire() {
        if let contentHandler, let bestAttempt {
            contentHandler(bestAttempt)
        }
    }
}
