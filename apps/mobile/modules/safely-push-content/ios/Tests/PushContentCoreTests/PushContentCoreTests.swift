import XCTest
@testable import PushContentCore

final class PushContentCoreTests: XCTestCase {
    private let names = ["ref-1": "Reserve"]

    func testRendersWalletNamePlaceholder() {
        XCTAssertEqual(
            PushContentCore.render(template: "{{wallet_name}} received 0.001 BTC", walletName: "Reserve"),
            "Reserve received 0.001 BTC"
        )
    }

    func testRejectsUnknownPlaceholder() {
        XCTAssertNil(PushContentCore.render(template: "{{wallet_name}} got {{amount}}", walletName: "Reserve"))
    }

    func testWalletNameContainingPlaceholderIsNotExpandedAgain() {
        XCTAssertEqual(
            PushContentCore.render(template: "{{wallet_name}}", walletName: "{{wallet_name}}"),
            nil
        )
    }

    func testRewritesTitleAndBodyFromTemplates() {
        let result = PushContentCore.rewrite(
            title: "Incoming transaction",
            body: "You received 0.001 BTC",
            data: [
                "target_ref": "ref-1",
                "title_template": "{{wallet_name}}",
                "body_template": "{{wallet_name}} received 0.001 BTC"
            ],
            walletNames: names
        )
        XCTAssertEqual(result, RewrittenPushContent(title: "Reserve", body: "Reserve received 0.001 BTC"))
    }

    func testKeepsOriginalPartWhenOnlyOneTemplateIsGiven() {
        let result = PushContentCore.rewrite(
            title: "Incoming transaction",
            body: "You received 0.001 BTC",
            data: ["target_ref": "ref-1", "body_template": "{{wallet_name}}: +0.001 BTC"],
            walletNames: names
        )
        XCTAssertEqual(result, RewrittenPushContent(title: "Incoming transaction", body: "Reserve: +0.001 BTC"))
    }

    func testFallsBackWhenRefUnknownOrTemplatesMissing() {
        XCTAssertNil(PushContentCore.rewrite(
            title: "t", body: "b",
            data: ["target_ref": "unknown", "body_template": "{{wallet_name}}"],
            walletNames: names
        ))
        XCTAssertNil(PushContentCore.rewrite(title: "t", body: "b", data: ["target_ref": "ref-1"], walletNames: names))
        XCTAssertNil(PushContentCore.rewrite(title: "t", body: "b", data: [:], walletNames: names))
    }

    func testFallsBackWhenAnyTemplateHasUnknownPlaceholder() {
        XCTAssertNil(PushContentCore.rewrite(
            title: "t", body: "b",
            data: ["target_ref": "ref-1", "title_template": "{{wallet_name}}", "body_template": "{{amount}}"],
            walletNames: names
        ))
    }

    func testSaveAndLoadRoundTrip() throws {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let url = PushContentCore.walletNamesURL(in: dir)

        try PushContentCore.save(walletNames: ["a": "Alpha", "b": "Бета 🐶"], to: url)
        XCTAssertEqual(PushContentCore.loadWalletNames(from: url), ["a": "Alpha", "b": "Бета 🐶"])

        try PushContentCore.save(walletNames: [:], to: url)
        XCTAssertEqual(PushContentCore.loadWalletNames(from: url), [:])
    }

    func testLoadReturnsEmptyForMissingOrCorruptFile() throws {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let url = PushContentCore.walletNamesURL(in: dir)
        XCTAssertEqual(PushContentCore.loadWalletNames(from: url), [:])

        try "not json".data(using: .utf8)!.write(to: url)
        XCTAssertEqual(PushContentCore.loadWalletNames(from: url), [:])
    }
}
