import { rmSync } from "fs";
import * as c from "colorette";
import { resolve, dirname, parse } from "path";
import { mergeAndConcat } from "merge-anything";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import { RollupOptions } from "rollup";
import { babel, RollupBabelInputPluginOptions } from "@rollup/plugin-babel";
import ts from "rollup-plugin-ts";
import { preppy } from "./preppy";

function findClosestPackageJson(start = process.cwd(), level = 0) {
  try {
    const path = resolve(start, "package.json");
    return require(path);
  } catch {
    return level >= 10 ? {} : findClosestPackageJson(dirname(start), level + 1);
  }
}

function processOptions(options: Options, asSubPackage = true): RollupOptions[] {
  const {
    sourcemap,
    printInstructions,
    babelOptions,
    solidOptions,
    mappingName,
    ...rollupOptions
  } = options;
  const currentDir = process.cwd();
  const pkg = findClosestPackageJson(currentDir);
  const extensions = [".js", ".ts", ".jsx", ".tsx"];

  const src = options.input || pkg.source;
  if (!src) {
    throw new Error(
      'No input was provided. Please provide an input via the "input" option or via "source" in the package.json'
    );
  }

  const { name: srcName } = parse(src);
  const name = mappingName || srcName;

  const external = [
    "solid-js",
    "solid-js/web",
    "solid-js/store",
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ];

  const babelTargets = pkg.browserslist || "last 2 years";

  if (!src) {
    throw new Error(
      "No input source found. You can add it to the `source` property in your `package.json` or feed it into the `input` option in the `withConfig` function."
    );
  }

  const defaultOptions: RollupOptions = {
    input: resolve(src),
    external,
    output: {
      format: "esm",
      dir: resolve(`dist/es/${asSubPackage ? name : ""}`),
      sourcemap,
    },
    plugins: [
      ts({}),
      babel({
        extensions,
        babelHelpers: "bundled",
        presets: [
          ["babel-preset-solid", solidOptions || {}],
          ["@babel/preset-typescript", { jsx: "preserve" }],
          ["@babel/preset-env", { bugfixes: true, targets: babelTargets }],
        ],
        ...babelOptions,
      }),
      nodeResolve({ extensions }),
      {
        name: "instructions",
        buildEnd() {
          if (!printInstructions) return;

          const example = {
            files: ["dist"],
            module: asSubPackage
              ? `dist/es/${name}/index.js`
              : `dist/es/${name}.js`,
            main: "",
            types: asSubPackage
              ? `dist/${name}/${name}.d.ts`
              : `dist/types/${name}.d.ts`,
            exports: {
              ".": {
                solid: asSubPackage
                  ? `./dist/jsx/${name}/index.jsx`
                  : `./dist/jsx/${name}.jsx`,
                import: asSubPackage
                  ? `./dist/es/${name}/index.js`
                  : `./dist/es/${name}.js`,
                require: "",
                node: "",
                browser: "",
              },
            },
          };

          example.main = example.module;
          example.exports["."].require = example.exports["."].import;
          example.exports["."].node = example.exports["."].import;
          example.exports["."].browser = example.exports["."].import;

          console.log();
          console.log(
            c.cyan(c.bold("Example config for your `package.json`:"))
          );
          console.log();
          console.log(c.green(JSON.stringify(example, null, 2)));
          console.log();
        },
      },
    ],
  };

  const jsxOptions: RollupOptions = {
    input: resolve(src),
    external,
    output: {
      format: "esm",
      dir: resolve(`dist/jsx/${asSubPackage ? name : ""}`),
      entryFileNames: "[name].jsx",
      sourcemap,
    },
    plugins: [
      babel({
        extensions,
        babelHelpers: "bundled",
        presets: [
          ["@babel/preset-typescript", { jsx: "preserve" }],
          ["@babel/preset-env", { bugfixes: true, targets: babelTargets }],
        ],
        ...babelOptions,
      }),
      preppy,
      nodeResolve({ extensions }),
    ],
  };

  return [
    mergeAndConcat(rollupOptions, defaultOptions) as RollupOptions,
    mergeAndConcat(rollupOptions, jsxOptions) as RollupOptions,
  ];
}

export default function withSolid(options: Options | Options[] = {}) {
  rmSync(resolve(process.cwd(), "dist"), {
    force: true,
    recursive: true,
  });

  return Array.isArray(options)
    ? options.flatMap((option) => processOptions(option, true))
    : processOptions(options, false);
}

export interface Options extends RollupOptions {
  /**
   * Whether to output sourcemaps or not
   * @default false
   */
  sourcemap?: boolean;
  /**
   * Whether to hint what to put in your package.json or not
   * @default false
   */
  printInstructions?: boolean;
  /**
   * This can be used to override the default babel options
   * The targets can be set in the "browserslist" field in your `package.json`.
   * Beware the options are only merged at the top level.
   * If you add babel presets you'll need to add the default one back (as you see fit).
   * @default {
   *   extensions,
   *   babelHelpers: "bundled",
   *   presets: ["babel-preset-solid", "@babel/preset-typescript", ['@babel/preset-env', { bugfixes: true, targets: "last 2 years" }]],
   * }
   */
  babelOptions?: RollupBabelInputPluginOptions;
  solidOptions?: SolidOptions;
  /**
   * TODO: Document this
   */
  mappingName?: string;
}

interface SolidOptions {
  /**
   * The name of the runtime module to import the methods from.
   *
   * @default "solid-js/web"
   */
  moduleName?: string;

  /**
   * The output mode of the compiler.
   * Can be:
   * - "dom" is standard output
   * - "ssr" is for server side rendering of strings.
   *
   * @default "dom"
   */
  generate?: "ssr" | "dom";

  /**
   * Indicate whether the output should contain hydratable markers.
   *
   * @default false
   */
  hydratable?: boolean;

  /**
   * Boolean to indicate whether to enable automatic event delegation on camelCase.
   *
   * @default true
   */
  delegateEvents?: boolean;

  /**
   * Boolean indicates whether smart conditional detection should be used.
   * This optimizes simple boolean expressions and ternaries in JSX.
   *
   * @default true
   */
  wrapConditionals?: boolean;

  /**
   * Boolean indicates whether to set current render context on Custom Elements and slots.
   * Useful for seemless Context API with Web Components.
   *
   * @default true
   */
  contextToCustomElements?: boolean;

  /**
   * Array of Component exports from module, that aren't included by default with the library.
   * This plugin will automatically import them if it comes across them in the JSX.
   *
   * @default ["For","Show","Switch","Match","Suspense","SuspenseList","Portal","Index","Dynamic","ErrorBoundary"]
   */
  builtIns?: string[];
}
