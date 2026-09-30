package expo.modules.safelypushcontent

import java.io.File
import java.util.Properties

internal data class RewrittenPushContent(val title: String, val body: String)

internal const val WALLET_NAME_PLACEHOLDER = "{{wallet_name}}"
internal const val TARGET_REF_KEY = "target_ref"
internal const val TITLE_TEMPLATE_KEY = "title_template"
internal const val BODY_TEMPLATE_KEY = "body_template"
internal const val WALLET_NAMES_FILE_NAME = "push-wallet-names.properties"

internal class WalletNameStore(private val file: File) {
    fun save(names: Map<String, String>) {
        val properties = Properties()
        names.forEach { (ref, name) -> properties.setProperty(ref, name) }
        val tmp = File(file.parentFile, file.name + ".tmp")
        tmp.parentFile?.mkdirs()
        tmp.writer(Charsets.UTF_8).use { properties.store(it, null) }
        if (!tmp.renameTo(file)) {
            tmp.copyTo(file, overwrite = true)
            tmp.delete()
        }
    }

    fun load(): Map<String, String> {
        if (!file.exists()) return emptyMap()
        return try {
            val properties = Properties()
            file.reader(Charsets.UTF_8).use { properties.load(it) }
            properties.stringPropertyNames().associateWith { properties.getProperty(it) }
        } catch (e: Exception) {
            emptyMap()
        }
    }
}

internal fun renderPushTemplate(template: String, walletName: String): String? {
    val rendered = template.replace(WALLET_NAME_PLACEHOLDER, walletName)
    return if (containsPlaceholder(rendered)) null else rendered
}

internal fun rewritePushContent(
    title: String?,
    body: String?,
    data: Map<String, String>,
    walletNames: Map<String, String>
): RewrittenPushContent? {
    val walletName = data[TARGET_REF_KEY]?.let { walletNames[it] } ?: return null
    val titleTemplate = data[TITLE_TEMPLATE_KEY]
    val bodyTemplate = data[BODY_TEMPLATE_KEY]
    if (titleTemplate == null && bodyTemplate == null) return null

    val newTitle = titleTemplate?.let { renderPushTemplate(it, walletName) ?: return null } ?: title ?: ""
    val newBody = bodyTemplate?.let { renderPushTemplate(it, walletName) ?: return null } ?: body ?: ""
    return RewrittenPushContent(newTitle, newBody)
}

private fun containsPlaceholder(text: String): Boolean {
    val open = text.indexOf("{{")
    return open >= 0 && text.indexOf("}}", open + 2) >= 0
}
