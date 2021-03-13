# rollup-preset-solid

A small opinionated preset for rollup to bundle your [solid](https://github.com/ryansolid/solid) libraries with rollup.

Features out of the box:

* Automatic TypeScript
* Minimal - two lines config
* No lock-in - you are in total control of the rollup config
* Best practices for publishing solid libraries by compiling for `esm`, `cjs`, `jsx` and `tsc`
* Automatically clean `dist` fodler on build

## Usage

1. Install with your favorite package manager:

```sh
npm install -D rollup-preset-solid rollup
pnpm add -D rollup-preset-solid rollup
yarn add -D rollup-preset-solid rollup
```

2. Import `withConfig` in your `rollup.config.js`. The first and only argument is (optionally) your rollup config:

```js
// rollup.config.js
import withSolid from 'rollup-preset-solid'

export default withSolid()
```

3. Configure your package.json

```json
{
  "name": "my-lib",

  "// This is optional but this remove the need to manually configure the source input for rollup": "",
  "source": "src/my-lib.tsx",

  "// All the following properties will be hinted during build": "",
  "// You will just have to copy paste them": "",

  "main": "dist/cjs/my-lib.js",
  "module": "dist/esm/my-lib.js",
  "types": "dist/types/my-lib.d.ts",
  "files": [
    "dist"
  ],
  "exports": {
    ".": {
      "solid": "./dist/source/my-lib.jsx",
      "import": "./dist/esm/my-lib.js",
      "browser": "./dist/esm/my-lib.js",
      "require": "./dist/cjs/my-lib.js",
      "node": "./dist/cjs/my-lib.js"
    }
  }
}
```