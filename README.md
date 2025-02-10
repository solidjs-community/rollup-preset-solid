<p>
  <img width="100%" src="https://assets.solidjs.com/banner?type=Rollup%20Preset&background=tiles&project=%20" alt="Solid Rollup Preset">
</p>

# Solid Rollup Preset

A small opinionated preset for rollup to bundle your [solid](https://github.com/ryansolid/solid) libraries with rollup.

Features out of the box:

- Automatic TypeScript
- Minimal - two lines config
- No lock-in - you are in total control of the rollup config
- Best practices for publishing solid libraries by compiling for `esm`, `cjs`, `jsx`, `umd` and `tsc`
- Automatically clean `dist` folder on build

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
import withSolid from "rollup-preset-solid";

export default withSolid();
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
  "files": ["dist"],
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

## API

### withSolid(options?: Options | Options[]): RollupOptions | RollupOptions[]

The default export. A wrapper function that accepts all of the rollup options and a few extra to configure what to generate.

### Options

The options are the exact same as Rollup with a few extra that are
specific to the wrapper

#### Interface

```ts
interface Options extends RollupOptions {
  /**
   * Defines which target you want
   * @default ['esm']
   */
  targets?: ModuleFormat[];
  /**
   * Whether to generate a package.json or not
   * This is useful for sub packages
   * @default false
   */
  writePackageJson?: boolean;
  /**
   * Whether to hint what to put in your package.json or not
   * @default false
   */
  printInstructions?: boolean;
}
```

#### Example

```js
// rollup.config.js
import withSolid from "rollup-preset-solid";

export default withSolid([
  { input: "browser.ts", targets: ["esm"] },
  { input: "server.ts", targets: ["esm", "cjs"], writePackageJson: true },
]);
```

#### IIFE Builds

When building with the IIFE format, the preset marks certain Solid packages (such as `"solid-js"`, `"solid-js/web"`, and `"solid-js/store"`) as external by default. This means they are not bundled into your output and instead are expected to be provided as globals. You have two options:

1. **Bundle the Solid Modules**  
   Override the external list so that these modules are included in your IIFE bundle. For example:

   ```js
   // rollup.config.js
   import withSolid from "rollup-preset-solid";

   export default withSolid({
     input: "App.tsx",
     external: [], // Override default externals to bundle everything
     output: {
       dir: "dist",
       format: "iife",
       sourcemap: false,
     },
   });
   ```

2. **Provide Global Mappings**  
   Keep the modules external and specify globals by using the `globals` option. For example:

   ```js
   // rollup.config.js
   import withSolid from "rollup-preset-solid";

   export default withSolid({
     input: "App.tsx",
     output: {
       dir: "dist",
       format: "iife",
       sourcemap: false,
       globals: {
         "solid-js/web": "SolidWeb",
         // add mappings for "solid-js" and "solid-js/store" if needed
       },
     },
   });
   ```

Internally the preset adds these packages to the default `external` array by reading your package's dependencies and peerDependencies. For IIFE builds you must either bundle them or provide the expected globals. This ensures that your browser bundle works as intended.
