Pod::Spec.new do |s|
  s.name           = 'SafelyMaskedInput'
  s.version        = '1.0.0'
  s.summary        = 'Native masked text input for Safely wallet'
  s.author         = 'Treadsafely'
  s.homepage       = 'https://github.com/treadsafely/Safely'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.swift_version  = '5.9'

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.{h,m,swift}'
  s.exclude_files = ['Package.swift', 'Tests/**/*', '.build/**/*', '.swiftpm/**/*']

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
