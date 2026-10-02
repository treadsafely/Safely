Pod::Spec.new do |s|
  s.name           = 'SafelyCrypto'
  s.version        = '1.0.0'
  s.summary        = 'Native cryptographic primitives (CommonCrypto) for Safely wallet'
  s.author         = 'Treadsafely'
  s.homepage       = 'https://github.com/treadsafely/Safely'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.swift_version  = '5.9'

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.{h,m,swift}'
  # Host-only SwiftPM test harness (see Package.swift) — keep it out of the pod:
  # Package.swift imports PackageDescription and the Tests import XCTest.
  s.exclude_files = ['Package.swift', 'Tests/**/*', '.build/**/*', '.swiftpm/**/*']

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
