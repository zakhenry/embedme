# File types

Plain Text

```txt
// sample.txt
```

Typescript

```ts
// sample.ts
```

Javascript

```js
// sample.js
```

HTML

```html
<!-- sample.html -->
```

Python

```py
# sample.py
```

Rust

```rust
// sample.rs

```

C++

```cpp
// sample.cpp
```

C

```c
// sample.c
```

Java

```java
// sample.java
```

Golang

```go
// sample.go
```

Bash

```sh
# sample.sh
```

Shell

```sh
# sample.sh
```

Objective C

```objectivec
// sample.m
```

SCSS

```scss
// sample.scss
```

PHP

```php
// sample.php
```

C#

```cs
// sample.cs
```

Swift

```swift
// sample.swift
```

XML

```xml
<!-- sample.xml -->
```

Yaml

```yaml
# sample.yaml
```

JSON

<!-- embedme sample.json -->

```json

```

JSON5

```json5
// sample.json5
```

Ruby

```rb
# sample.rb
```

Crystal

```cr
# sample.cr
```

Kotlin

```kotlin
// sample.kt
```

Scala

```scala
// sample.scala
```

Plant UML

```puml
' sample.puml
```

Mermaid

```mermaid
%% sample.mermaid
```

Protobuf

```proto
// sample.proto
```

CMake

```cmake
# sample.cmake
```

SQL Script

```sql
-- sample.sql
```

Haskell

```hs
-- sample.hs
```

## Extension-less selection

```sh
# sample
```

## Line selection

```cs
// sample.cs#L6-L13
```

## Indented selection

    ```ts
    // sample.ts
    ```

## Embedme Ignore

<!-- embedme-ignore-next -->

```ts
// sample.ts
```

## Embedme Ignore alt syntax

<!-- embedme ignore-next -->

```ts
// sample.ts
```

## Embed with comment

<!-- embedme sample.ts -->

```ts
```

### Embed with comment and unknown file type

<!-- embedme sample.json -->

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
// sample.ts#L1-2
```

### missing comment on language embed with no comment support

```json

```
