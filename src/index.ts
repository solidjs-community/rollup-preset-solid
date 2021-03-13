import { RollupOptions } from "rollup";
import { merge } from "merge-anything";
import { resolve, dirname } from "path";
import { babel } from "@rollup/plugin-babel";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import ts from "typescript";

function findClosestPackageJson(start = __dirname, level = 0) {
  try {
    const path = resolve(start, "package.json");
    return require(path);
  } catch {
    return level >= 10 ? {} : findClosestPackageJson(dirname(start), level + 1);
  }
}

export default function withSolid(options: RollupOptions = {}) {
  const pkg = findClosestPackageJson();
  const extensions = [".js", ".ts", ".jsx", ".tsx"];

  const defaultOptions: RollupOptions = {
    input: resolve(pkg.source),
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
      babel({
        extensions,
        babelHelpers: "bundled",
        presets: ["babel-preset-solid", "@babel/preset-typescript"],
      }),
      nodeResolve({ extensions }),
      {
        name: "ts:source",
        buildEnd() {
          const program = ts.createProgram([resolve(pkg.source)], {
            target: ts.ScriptTarget.ESNext,
            module: ts.ModuleKind.ESNext,
            moduleResolution: ts.ModuleResolutionKind.NodeJs,
            jsx: ts.JsxEmit.Preserve,
            outDir: "dist/source",
            declaration: false,
            jsxImportSource: "solid-js",
            allowSyntheticDefaultImports: true,
            esModuleInterop: true,
          });

          program.emit();
        },
      },
      {
        name: "ts:types",
        buildEnd() {
          const program = ts.createProgram([resolve(pkg.source)], {
            target: ts.ScriptTarget.ESNext,
            module: ts.ModuleKind.ESNext,
            moduleResolution: ts.ModuleResolutionKind.NodeJs,
            jsx: ts.JsxEmit.Preserve,
            outDir: "dist/source",
            declaration: true,
            emitDeclarationOnly: true,
            jsxImportSource: "solid-js",
            allowSyntheticDefaultImports: true,
            esModuleInterop: true,
          });

          program.emit();
        },
      },
    ],
  };

  return merge(options, defaultOptions);
}
