import Foundation

public struct RewrittenPushContent: Equatable {
    public let title: String
    public let body: String
}

public enum PushContentCore {
    public static let appGroupId = "group.com.safely.wallet"
    public static let walletNamePlaceholder = "{{wallet_name}}"

    static let walletNamesFileName = "push-wallet-names.json"
    static let targetRefKey = "target_ref"
    static let titleTemplateKey = "title_template"
    static let bodyTemplateKey = "body_template"

    public static func walletNamesURL(in containerURL: URL) -> URL {
        containerURL.appendingPathComponent(walletNamesFileName, isDirectory: false)
    }

    public static func save(walletNames: [String: String], to url: URL) throws {
        let data = try JSONSerialization.data(withJSONObject: walletNames, options: [.sortedKeys])
        var options: Data.WritingOptions = [.atomic]
        #if os(iOS)
        options.insert(.completeFileProtectionUntilFirstUserAuthentication)
        #endif
        try data.write(to: url, options: options)

        var resourceURL = url
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try? resourceURL.setResourceValues(values)
    }

    public static func loadWalletNames(from url: URL) -> [String: String] {
        guard let data = try? Data(contentsOf: url),
              let json = try? JSONSerialization.jsonObject(with: data),
              let names = json as? [String: String] else {
            return [:]
        }
        return names
    }

    public static func render(template: String, walletName: String) -> String? {
        let rendered = template.replacingOccurrences(of: walletNamePlaceholder, with: walletName)
        guard !containsPlaceholder(rendered) else { return nil }
        return rendered
    }

    public static func rewrite(
        title: String,
        body: String,
        data: [String: Any],
        walletNames: [String: String]
    ) -> RewrittenPushContent? {
        guard let targetRef = data[targetRefKey] as? String,
              let walletName = walletNames[targetRef] else {
            return nil
        }
        let titleTemplate = data[titleTemplateKey] as? String
        let bodyTemplate = data[bodyTemplateKey] as? String
        guard titleTemplate != nil || bodyTemplate != nil else { return nil }

        var newTitle = title
        if let titleTemplate {
            guard let rendered = render(template: titleTemplate, walletName: walletName) else { return nil }
            newTitle = rendered
        }
        var newBody = body
        if let bodyTemplate {
            guard let rendered = render(template: bodyTemplate, walletName: walletName) else { return nil }
            newBody = rendered
        }
        return RewrittenPushContent(title: newTitle, body: newBody)
    }

    private static func containsPlaceholder(_ text: String) -> Bool {
        guard let open = text.range(of: "{{") else { return false }
        return text[open.upperBound...].contains("}}")
    }
}
