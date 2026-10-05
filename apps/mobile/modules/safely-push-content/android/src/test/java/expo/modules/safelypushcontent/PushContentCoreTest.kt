package expo.modules.safelypushcontent

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.io.File
import java.nio.file.Files

class PushContentCoreTest {
    private val names = mapOf("ref-1" to "Reserve")

    @Test
    fun rendersWalletNamePlaceholder() {
        assertEquals(
            "Reserve received 0.001 BTC",
            renderPushTemplate("{{wallet_name}} received 0.001 BTC", "Reserve")
        )
    }

    @Test
    fun rejectsUnknownPlaceholder() {
        assertNull(renderPushTemplate("{{wallet_name}} got {{amount}}", "Reserve"))
    }

    @Test
    fun walletNameContainingPlaceholderIsNotExpandedAgain() {
        assertNull(renderPushTemplate("{{wallet_name}}", "{{wallet_name}}"))
    }

    @Test
    fun rewritesTitleAndBodyFromTemplates() {
        val result = rewritePushContent(
            "Incoming transaction",
            "You received 0.001 BTC",
            mapOf(
                "target_ref" to "ref-1",
                "title_template" to "{{wallet_name}}",
                "body_template" to "{{wallet_name}} received 0.001 BTC"
            ),
            names
        )
        assertEquals(RewrittenPushContent("Reserve", "Reserve received 0.001 BTC"), result)
    }

    @Test
    fun keepsOriginalPartWhenOnlyOneTemplateIsGiven() {
        val result = rewritePushContent(
            "Incoming transaction",
            "You received 0.001 BTC",
            mapOf("target_ref" to "ref-1", "body_template" to "{{wallet_name}}: +0.001 BTC"),
            names
        )
        assertEquals(RewrittenPushContent("Incoming transaction", "Reserve: +0.001 BTC"), result)
    }

    @Test
    fun fallsBackWhenRefUnknownOrTemplatesMissing() {
        assertNull(rewritePushContent("t", "b", mapOf("target_ref" to "unknown", "body_template" to "{{wallet_name}}"), names))
        assertNull(rewritePushContent("t", "b", mapOf("target_ref" to "ref-1"), names))
        assertNull(rewritePushContent("t", "b", emptyMap(), names))
    }

    @Test
    fun fallsBackWhenAnyTemplateHasUnknownPlaceholder() {
        assertNull(
            rewritePushContent(
                "t", "b",
                mapOf("target_ref" to "ref-1", "title_template" to "{{wallet_name}}", "body_template" to "{{amount}}"),
                names
            )
        )
    }

    @Test
    fun saveAndLoadRoundTrip() {
        val dir = Files.createTempDirectory("push-content").toFile()
        val store = WalletNameStore(File(dir, WALLET_NAMES_FILE_NAME))

        store.save(mapOf("a" to "Alpha", "b" to "Бета 🐶", "c" to "tabs\tand=equals"))
        assertEquals(mapOf("a" to "Alpha", "b" to "Бета 🐶", "c" to "tabs\tand=equals"), store.load())

        store.save(emptyMap())
        assertEquals(emptyMap<String, String>(), store.load())
    }

    @Test
    fun loadReturnsEmptyForMissingFile() {
        val dir = Files.createTempDirectory("push-content").toFile()
        assertEquals(emptyMap<String, String>(), WalletNameStore(File(dir, "missing")).load())
    }
}
