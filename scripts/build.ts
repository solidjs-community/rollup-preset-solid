import { build } from "esbuild";
import { rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";

import pkg from "../package.json";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");

rmSync(dist, { force: true, recursive: true });

build({
  entryPoints: [join(root, "src", "index.ts")],
  sourcemap: true,
  outdir: "dist/esm",
  bundle: true,
  format: "esm",
  platform: "node",
  external: Object.keys(pkg.dependencies),
});

exec(
  `pnpm tsc src/index.ts --sourceMap --outDir dist/types --declaration --emitDeclarationOnly`
);
