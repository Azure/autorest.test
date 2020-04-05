# Autorest Test

See documentation [here](doc/00-overview.md)

``` yaml
use-extension:
  "@microsoft.azure/autorest.modeler": "2.3.45" # keep in sync with package.json's dev dependency in order to have meaningful tests

pipeline:
    test/imodeler1:
        input: openapi-document/identity
        output-artifact: code-model-v1
        scope: test
    test/commonmarker:
        input: imodeler1
        output-artifact: code-model-v1
    test/cm/transform:
        input: commonmarker
        output-artifact: code-model-v1
    test/cm/emitter:
        input: transform
        scope: scope-cm/emitter
    test/generate:
        plugin: test
        input: cm/transform
        output-artifact: source-file-cli
    test/transform:
        input: generate
        output-artifact: source-file-cli
        scope: scope-transform-string
    test/emitter:
        input: transform
        scope: scope-test/emitter

scope-test/emitter:
  input-artifact: source-file-cli
  output-uri-expr: $key

output-artifact:
- source-file-cli
```

``` yaml 
use-extension:
  "test": "$(this-folder)"
```
