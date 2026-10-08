{
  "targets": [
    {
      "target_name": "keychain",
      "sources": ["src/keychain.mm"],
      "include_dirs": ["<!@(node -p \"require('node-addon-api').include_dir\")"],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
      "conditions": [
        [
          "OS==\"mac\"",
          {
            "xcode_settings": {
              "CLANG_ENABLE_OBJC_ARC": "YES",
              "GCC_ENABLE_CPP_EXCEPTIONS": "NO",
              "MACOSX_DEPLOYMENT_TARGET": "11.0"
            },
            "link_settings": {
              "libraries": [
                "$(SDKROOT)/System/Library/Frameworks/Foundation.framework",
                "$(SDKROOT)/System/Library/Frameworks/Security.framework"
              ]
            }
          }
        ]
      ]
    }
  ]
}
