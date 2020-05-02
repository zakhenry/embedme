# File types

Plain Text

```txt
// snippets/sample.txt
```

Reason

```re
// snippets/sample.re
```

Typescript

```ts
// snippets/sample.ts
```

Javascript

```js
// snippets/sample.js
```

HTML

```html
<!-- snippets/sample.html -->
```

Python

```py
# snippets/sample.py
```

Rust

```rust
// snippets/sample.rs

```

C++

```cpp
// snippets/sample.cpp
```

Arduino

```cpp
// snippets/sample.ino
```

C

```c
// snippets/sample.c
```

Java

```java
// snippets/sample.java
```

Golang

```go
// snippets/sample.go
```

Bash

```sh
# snippets/sample.sh
```

Shell

```sh
# snippets/sample.sh
```

Objective C

```objectivec
// snippets/sample.m
```

SCSS

```scss
// snippets/sample.scss
```

PHP

```php
// snippets/sample.php
```

C#

```cs
// snippets/sample.cs
```

Swift

```swift
// snippets/sample.swift
```

XML

```xml
<!-- snippets/sample.xml -->
```

Yaml

```yaml
# snippets/sample.yaml
```

JSON

<!-- embedme snippets/sample.json -->

```json

```

JSON5

```json5
// snippets/sample.json5
```

Ruby

```rb
# snippets/sample.rb
```

Crystal

```cr
# snippets/sample.cr
```

Kotlin

```kotlin
// snippets/sample.kt
```

Scala

```scala
// snippets/sample.scala
```

Plant UML

```puml
' snippets/sample.puml
```

Mermaid

```mermaid
%% snippets/sample.mermaid
```

Protobuf

```proto
// snippets/sample.proto
```

CMake

```cmake
# snippets/sample.cmake
```

SQL Script

```sql
-- snippets/sample.sql
```

Haskell

```hs
-- snippets/sample.hs
```

## Extension-less selection

```sh
# snippets/sample
```

## Line selection

```cs
// snippets/sample.cs#L6-L13
```

## Indented selection

    ```ts
    // snippets/sample.ts
    ```

## Embedme Ignore

<!-- embedme-ignore-next -->

```ts
// snippets/sample.ts
```

## Embedme Ignore alt syntax

<!-- embedme ignore-next -->

```ts
// snippets/sample.ts
```

## Embed with comment

<!-- embedme snippets/sample.ts -->

```ts
```

### Embed with comment and unknown file type

<!-- embedme snippets/sample.json -->

```{.json caption="Some JSON file"}

```

## Errors

### Empty block

```ts
```

### No file handler

```binary
01001000 01100101 01101100 01101100 01101111 00100000 01010111 01101111 01110010 01101100 01100100
```

### No file extension

```
Ignored block
```

### Bad file format

```ts
// Not a file
```

### Also bad file format

```ts
// also-not-a-file
```

### Missing file

```txt
// this-file-does-not-exist.txt
```

### Contains Codefence

```md
<!-- contains-codefence.md -->
```

### Contains Codefence, but not the embedded lines

```md
<!-- contains-codefence.md#L1-L3 -->

# This markdown document

## Contains a codefence
```

### malformed line numbering

```ts
// snippets/sample.ts#L1-2
```

### missing comment on language embed with no comment support

```json

```
