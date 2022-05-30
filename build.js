import { rmSync } from "fs";
import { resolve, dirname } from "path";
import { build } from "esbuild";
import { exec } from "child_process";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

import pkg from "./package.json" assert { type: "json" };

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
  `pnpm tsc src/index.ts --sourceMap --outDir dist/types --declaration --emitDeclarationOnly`
);
