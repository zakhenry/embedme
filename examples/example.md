Here is a _markdown_ document

```ts
// example.ts

export function hello(name: string): string {
  return `Hello ${name}!, how are you today?`;
}
```

```re
// example.re

let hello = (name: string) => {
  "Hello " ++ name ++ "!, " ++ "how are you today?";
};

```

```re
// example.rei

let hello: string => unit;

```

```ml
// example.ml

let hello (name : string) =
  "Hello " ^ (name ^ ("!, " ^ "how are you today?"))
```

```ml
// example.mli

val hello : string -> unit
```
