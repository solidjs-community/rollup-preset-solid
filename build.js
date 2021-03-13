const { rmSync } = require("fs");
const { resolve } = require("path");
const { build } = require("esbuild");
const pkg = require("./package.json");
const { exec } = require("child_process");

rmSync(resolve(__dirname, "dist"), { force: true, recursive: true });

build({
  entryPoints: ["src/index.ts"],
  sourcemap: true,
  outdir: "dist/cjs",
  external: Object.keys(pkg.dependencies),
  bundle: true,
  format: "cjs",
  platform: "node",
});

build({
  entryPoints: ["src/index.ts"],
  sourcemap: true,
  outdir: "dist/esm",
  external: Object.keys(pkg.dependencies),
  bundle: true,
  format: "esm",
  platform: "node",
});

exec(
  `pnpx tsc src/index.ts --sourceMap --outDir dist/types --declaration --emitDeclarationOnly`
);
