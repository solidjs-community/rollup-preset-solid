import ts from "typescript";
import * as c from "colorette";
import { cwd } from "node:process";
import terser from "@rollup/plugin-terser";
import { mergeAndConcat } from "merge-anything";
import { resolve, dirname, parse } from "node:path";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import { writeFileSync, rmSync, readFileSync } from "node:fs";
import { ModuleFormat, OutputOptions, RollupOptions } from "rollup";
import { babel, RollupBabelInputPluginOptions } from "@rollup/plugin-babel";

function findClosestPackageJson(start = cwd(), level = 0) {
  try {
    const path = resolve(start, "package.json");
    const content = readFileSync(path, { encoding: "utf8" });
    return JSON.parse(content);
  } catch {
    return level >= 10 ? {} : findClosestPackageJson(dirname(start), level + 1);
  }
}

function processOptions(options: Options, asSubPackage = true): RollupOptions {
  const {
    targets: buildTargets,
    writePackageJson,
    printInstructions,
    babelOptions,
    solidOptions,
    mappingName,
    tsCompilerOptions,
    ...rollupOptions
  } = options;
  const currentDir = process.cwd();
  const targets = buildTargets || ["esm"];
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
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ];

  const babelTargets = pkg.browserslist || "last 2 years";

  if (!src) {
    throw new Error(
      "No input source found. You can add it to the `source` property in your `package.json` or feed it into the `input` option in the `withConfig` function."
    );
  }

  const outputs: OutputOptions[] = [
    {
      format: "cjs",
      file: asSubPackage ? resolve(`dist/${name}/index.common.js`) : undefined,
      dir: asSubPackage ? undefined : resolve("dist/cjs"),
      sourcemap: true,
    },
    {
      format: "esm",
      file: asSubPackage ? resolve(`dist/${name}/index.module.js`) : undefined,
      dir: asSubPackage ? undefined : resolve("dist/esm"),
      sourcemap: true,
    },
    {
      name,
      format: "umd",
      file: asSubPackage ? resolve(`dist/${name}/index.umd.js`) : undefined,
      dir: asSubPackage ? undefined : resolve("dist/umd"),
      sourcemap: true,
      plugins: [terser()],
    },
  ];

  const output: OutputOptions[] | OutputOptions =
    rollupOptions.output ||
    outputs.filter(({ format }) => targets.includes(format as ModuleFormat));

  const defaultOptions: Options = {
    input: resolve(src),
    external: ["solid-js", "solid-js/web", "solid-js/store", ...external],
    output,
    plugins: [
      babel({
        extensions,
        babelHelpers: "bundled",
        presets: [
          ["babel-preset-solid", solidOptions || {}],
          "@babel/preset-typescript",
          ["@babel/preset-env", { bugfixes: true, targets: babelTargets }],
        ],
        ...babelOptions,
      }),
      nodeResolve({ extensions }),
      {
        name: "ts",
        buildEnd() {
          const program = ts.createProgram([resolve(src)], {
            target: ts.ScriptTarget.ESNext,
            module: ts.ModuleKind.ESNext,
            moduleResolution: ts.ModuleResolutionKind.NodeJs,
            jsx: ts.JsxEmit.Preserve,
            jsxImportSource: "solid-js",
            allowSyntheticDefaultImports: true,
            esModuleInterop: true,
            outDir: asSubPackage ? `dist/${name}` : `dist/source`,
            declarationDir: asSubPackage ? `dist/${name}` : `dist/types`,
            declaration: true,
            allowJs: true,
            ...tsCompilerOptions
          });

          program.emit();
        },
      },
      {
        name: "instructions",
        buildEnd() {
          if (!printInstructions) return;

          const example = {
            files: ["dist"],
            main: asSubPackage
              ? `dist/${name}/index.common.js`
              : `dist/cjs/${name}.js`,
            module: asSubPackage
              ? `dist/${name}/index.module.js`
              : `dist/esm/${name}.js`,
            types: asSubPackage
              ? `dist/${name}/${name}.d.ts`
              : `dist/types/${name}.d.ts`,
            exports: {
              ".": {
                solid: asSubPackage
                  ? `./dist/${name}/${name}.jsx`
                  : `./dist/source/${name}.jsx`,
                import: asSubPackage
                  ? `./dist/${name}/index.module.js`
                  : `./dist/esm/${name}.js`,
                browser: asSubPackage
                  ? `./dist/${name}/index.umd.js`
                  : `./dist/umd/${name}.js`,
                require: asSubPackage
                  ? `./dist/${name}/index.common.js`
                  : `./dist/cjs/${name}.js`,
                node: asSubPackage
                  ? `./dist/${name}/index.common.js`
                  : `./dist/cjs/${name}.js`,
              },
            },
          };

          const hasFormat = (formats: ModuleFormat[]) => {
            return Array.isArray(output)
              ? output.find(({ format }) => format && formats.includes(format))
              : output.format && formats.includes(output.format);
          };

          if (!hasFormat(["cjs", "commonjs"])) {
            example.main = example.module;
            example.exports["."].require = example.exports["."].import;
            example.exports["."].node = example.exports["."].import;
          }

          if (!hasFormat(["umd"])) {
            example.exports["."].browser = example.exports["."].import;
          }

          console.log();
          console.log(
            c.cyan(c.bold("Example config for your `package.json`:"))
          );
          console.log();
          console.log(c.green(JSON.stringify(example, null, 2)));
          console.log();
        },
      },
      {
        name: "generate",
        buildEnd() {
          if (!writePackageJson) return;

          const build = {
            main: `index.common.js`,
            module: `index.module.js`,
            types: `${name}.d.ts`,
            exports: {
              ".": {
                solid: `./${name}.jsx`,
                import: `./index.module.js`,
                browser: `./index.umd.js`,
                require: `./index.common.js`,
                node: `./index.common.js`,
              },
            },
          };

          writeFileSync(
            resolve(currentDir, "dist", name, "package.json"),
            JSON.stringify(build, null, 2),
            { encoding: "utf8" }
          );
        },
      },
    ],
  };

  return mergeAndConcat(rollupOptions, defaultOptions) as RollupOptions;
}

export default function withSolid(options: Options | Options[] = {}) {
  rmSync(resolve(cwd(), "dist"), {
    force: true,
    recursive: true,
  });

  return Array.isArray(options)
    ? options.map((option) => processOptions(option, true))
    : processOptions(options, false);
}

export interface Options extends RollupOptions {
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
  /**
   * Additional TypeScript compiler options
   */
  tsCompilerOptions?: ts.CompilerOptions;
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
