import ts from "typescript";
import { rmSync } from "fs";
import * as c from "colorette";
import { RollupOptions } from "rollup";
import { babel } from "@rollup/plugin-babel";
import { resolve, dirname, parse } from "path";
import { mergeAndConcat } from "merge-anything";
import { nodeResolve } from "@rollup/plugin-node-resolve";

function findClosestPackageJson(start = process.cwd(), level = 0) {
  try {
    const path = resolve(start, "package.json");
    return require(path);
  } catch {
    return level >= 10 ? {} : findClosestPackageJson(dirname(start), level + 1);
  }
}

export default function withSolid(options: RollupOptions = {}) {
  const currentDir = process.cwd();
  const pkg = findClosestPackageJson(currentDir);
  const extensions = [".js", ".ts", ".jsx", ".tsx"];

  const src = pkg.source || options.input;
  const external = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ];

  if (!src) {
    throw new Error(
      "No input source found. You can add it to the `source` property in your `package.json` or feed it into the `input` option in the `withConfig` function."
    );
  }

  const defaultOptions: RollupOptions = {
    input: resolve(src),
    external: ["solid-js", "solid-js/web", ...external],
    output: [
      {
        format: "cjs",
        dir: resolve("dist/cjs"),
        sourcemap: true,
      },
      {
        format: "esm",
        dir: resolve("dist/esm"),
        sourcemap: true,
      },
    ],
    plugins: [
      {
        name: "clean",
        buildStart() {
          rmSync(resolve(currentDir, "dist"), {
            force: true,
            recursive: true,
          });
        },
      },
      babel({
        extensions,
        babelHelpers: "bundled",
        presets: ["babel-preset-solid", "@babel/preset-typescript"],
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
            outDir: "dist/source",
            declarationDir: "dist/types",
            declaration: true,
            allowJs: true,
          });

          program.emit();
        },
      },
      {
        name: "instructions",
        buildEnd() {
          const { name } = parse(src);

          const example = {
            files: ["dist"],
            main: `dist/cjs/${name}.js`,
            module: `dist/esm/${name}.js`,
            types: `dist/types/${name}.d.ts`,
            exports: {
              ".": {
                solid: `./dist/source/${name}.jsx`,
                import: `./dist/esm/${name}.js`,
                browser: `./dist/esm/${name}.js`,
                require: `./dist/cjs/${name}.js`,
                node: `./dist/cjs/${name}.js`,
              },
            },
          };

          console.log();
          console.log(
            c.cyan(c.bold("Add the following in your `package.json`:"))
          );
          console.log();
          console.log(c.green(JSON.stringify(example, null, 2)));
          console.log();
        },
      },
    ],
  };

  return mergeAndConcat(options, defaultOptions);
}
