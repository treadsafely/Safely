// swift-tools-version:5.9
import PackageDescription

// Host-only SwiftPM package so the pure push-content core can be unit-tested
// with `swift test`. It compiles ONLY PushContentCore.swift — the Expo module
// and the Notification Service Extension source are excluded. The real iOS
// build uses SafelyPushContent.podspec (app) and the config plugin
// (extension), not this file.
let package = Package(
    name: "PushContentCore",
    targets: [
        .target(name: "PushContentCore", path: "PushContentCore"),
        .testTarget(
            name: "PushContentCoreTests",
            dependencies: ["PushContentCore"],
            path: "Tests/PushContentCoreTests"
        ),
    ]
)
