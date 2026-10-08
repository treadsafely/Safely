Pod::Spec.new do |s|
  s.name           = 'SafelyFlame'
  s.version        = '1.0.0'
  s.summary        = 'Flame wallet addresses for Safely wallet, over @runflame/wallet-rn'
  s.author         = 'Treadsafely'
  s.homepage       = 'https://github.com/treadsafely/Safely'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.swift_version  = '5.9'

  s.dependency 'ExpoModulesCore'
  # Autolinked from @runflame/wallet-rn; Swift imports it as `FlameWallet`.
  s.dependency 'FlameWalletNative'

  s.source_files = '**/*.{h,m,swift}'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
