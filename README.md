# tsinstaller

## About

- Create a single executable installer using https://github.com/vercel/pkg
- Write installer steps using TypeScript
- Test the installer steps
- Add files to the installer (similar to `makeself.sh`)

## Example Project

Checkout the [example project](https://github.com/drorwolmer/tsinstaller/tree/main/example_project)

## Environment Variables

- `PKG_TARGET` (https://github.com/vercel/pkg#targets)

## Passing compile-time variables

environment variables prefixed with `TS_` will be available to the installer runtime, in the `COMPILE_TIME_VARIABLES` object

```sh
# When building the installer
TS_FOO=http://bar yarn compile "installer.ts"
```

```js
// From the installer runtime
console.error(COMPILE_TIME_VARIABLES["FOO"]); // "http://bar"
```
