# File types

Plain Text

```txt
// sample.txt

This file is unformatted plain text

```

Typescript

```ts
// sample.ts

export function hello(): string {
  return 'Hello World';
}
```

Javascript

```js
// sample.js

console.log('Hello World');
```

HTML

```html
<!-- sample.html -->

<h1>Hello world</h1>
```

Python

```py
# sample.py

print('Hello World')

```

Rust

```rs
// sample.rs

fn main() {
    println!("Hello World!");
}

```

C++

```cpp
// sample.cpp

#include <iostream>
using namespace std;

int main()
{
    cout << "Hello, World!";
    return 0;
}

```

C

```c
// sample.c

#include <stdio.h>
int main()
{
   // printf() displays the string inside quotation
   printf("Hello, World!");
   return 0;
}

```

Java

```java
// sample.java

public class HelloWorld {

    public static void main(String[] args) {
        // Prints "Hello, World" to the terminal window.
        System.out.println("Hello, World");
    }

}

```

Golang

```go
// sample.go

package main

import "fmt"

func main() {
    fmt.Println("hello world")
}

```

Bash

```sh
# sample.sh

#!/usr/bin/env bash
print Hello World

```

Shell

```sh
# sample.sh

#!/usr/bin/env bash
print Hello World

```

Objective C

```objectivec
// sample.m

#import <Foundation/Foundation.h>

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        NSLog(@"Hello, World!");
    }
    return 0;
}

```

SCSS

```scss
// sample.scss

.hello {
  .world {
    border: 1px solid red;
  }
}
```

PHP

```php
// sample.php

<?php
	echo 'Hello, World!';
?>

```

C#

```cs
// sample.cs

using System;
namespace HelloWorld
{
    class Hello
    {
        static void Main()
        {
            Console.WriteLine("Hello World!");

            // Keep the console window open in debug mode.
            Console.WriteLine("Press any key to exit.");
            Console.ReadKey();
        }
    }
}

```

Swift

```swift
// sample.swift

print("Hello, world!")

```

XML

```xml
<!-- sample.xml -->

<hello>
    <world>true</world>
</hello>

```

Yaml

```yaml
# sample.yaml

hello:
  - world
```

Ruby

```rb
# sample.rb

puts 'Hello, world!'

```

Kotlin

```kotlin
// sample.kt

fun main(args: Array<String>) {
    println("Hello World!")
}

```

Scala

```scala
// sample.scala

object HelloWorld {
  def main(args: Array[String]): Unit = {
    println("Hello, world!")
  }
}

```

## Line selection

```cs
// sample.cs#L6-L13

static void Main()
{
    Console.WriteLine("Hello World!");

    // Keep the console window open in debug mode.
    Console.WriteLine("Press any key to exit.");
    Console.ReadKey();
}
```

## Errors

```binary
01001000 01100101 01101100 01101100 01101111 00100000 01010111 01101111 01110010 01101100 01100100
```

```
Ignored block
```

```ts
// Not a file
```

```ts
// also-not-a-file
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
