Pod::Spec.new do |s|
  s.name           = 'SafelyPushContent'
  s.version        = '1.0.0'
  s.summary        = 'Wallet-name dictionary shared with the Notification Service Extension'
  s.author         = 'Treadsafely'
  s.homepage       = 'https://github.com/treadsafely/Safely'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.swift_version  = '5.9'

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.{h,m,swift}'
  # Package.swift + Tests/ are the host-only SwiftPM harness; NotificationService/
  # is compiled into the extension target by plugins/withPushContentExtension.js.
  s.exclude_files = ['Package.swift', 'Tests/**/*', 'NotificationService/**/*', '.build/**/*', '.swiftpm/**/*']

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
