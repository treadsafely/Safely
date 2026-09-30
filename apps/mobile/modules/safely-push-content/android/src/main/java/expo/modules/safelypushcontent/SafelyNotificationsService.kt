package expo.modules.safelypushcontent

import android.content.Context
import expo.modules.notifications.notifications.interfaces.INotificationContent
import expo.modules.notifications.notifications.model.Notification
import expo.modules.notifications.notifications.model.NotificationBehaviorRecord
import expo.modules.notifications.notifications.model.NotificationContent
import expo.modules.notifications.notifications.model.NotificationRequest
import expo.modules.notifications.service.NotificationsService
import expo.modules.notifications.service.delegates.ExpoPresentationDelegate
import expo.modules.notifications.service.interfaces.PresentationDelegate
import org.json.JSONObject

// Registered in this module's AndroidManifest with a higher priority than
// expo-notifications' receiver, so every notification is built here and can
// carry the wallet name. Any failure falls back to the original content.
class SafelyNotificationsService : NotificationsService() {
    override fun getPresentationDelegate(context: Context): PresentationDelegate =
        SafelyPresentationDelegate(context)
}

internal class SafelyPresentationDelegate(context: Context) : ExpoPresentationDelegate(context) {
    override suspend fun createNotification(
        notification: Notification,
        notificationBehavior: NotificationBehaviorRecord?
    ): android.app.Notification =
        super.createNotification(rewrite(notification), notificationBehavior)

    private fun rewrite(notification: Notification): Notification {
        return try {
            val request = notification.notificationRequest
            val content = request.content
            if (content.containsImage()) return notification

            val rewritten = rewritePushContent(
                content.title,
                content.text,
                dataOf(content.body),
                WalletNameStore(walletNamesFile(context)).load()
            ) ?: return notification

            Notification(
                NotificationRequest(request.identifier, copy(content, rewritten), request.trigger),
                notification.originDate
            )
        } catch (e: Exception) {
            notification
        }
    }

    private fun dataOf(body: JSONObject?): Map<String, String> {
        if (body == null) return emptyMap()
        return body.keys().asSequence().associateWith { body.optString(it) }
    }

    private fun copy(content: INotificationContent, rewritten: RewrittenPushContent): NotificationContent =
        NotificationContent.Builder()
            .setTitle(rewritten.title)
            .setText(rewritten.body)
            .setSubtitle(content.subText)
            .setBody(content.body)
            .setPriority(content.priority)
            .setBadgeCount(content.badgeCount)
            .setColor(content.color)
            .setAutoDismiss(content.isAutoDismiss)
            .setCategoryId(content.categoryId)
            .setSticky(content.isSticky)
            .build()
}
