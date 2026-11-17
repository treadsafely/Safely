{
  "targets": [
    {
      "target_name": "hello",
      "sources": ["src/hello.cpp"],
      "include_dirs": ["<!(node -p \"require('node-addon-api').include_dir\")"],
      "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS", "UNICODE", "_UNICODE", "NOMINMAX", "WIN32_LEAN_AND_MEAN"],
      "conditions": [
        [
          "OS==\"win\"",
          {
            "msvs_settings": {
              "VCCLCompilerTool": {
                "ExceptionHandling": 1,
                "AdditionalOptions": ["/std:c++20", "/permissive-", "/bigobj", "/Zc:__cplusplus"]
              }
            },
            "libraries": ["WindowsApp.lib", "user32.lib"]
          }
        ]
      ]
    }
  ]
}
