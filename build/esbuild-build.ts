import esbuild, { BuildOptions } from "esbuild";
import path from "path";
import * as fs from "fs";
import { createDynamicTypes } from "./dynamic-types";

const ENTRY_POINTS = {
  typescript: ["index.ts"],
  // css: ["static/style.css"],
};

const DATA_URL_LOADERS = [".png", ".woff", ".woff2", ".eot", ".ttf", ".svg"];

export const esbuildOptions: BuildOptions = {
  sourcemap: true,
  entryPoints: ENTRY_POINTS.typescript,
  bundle: true,
  minify: false,
  loader: Object.fromEntries(DATA_URL_LOADERS.map((ext) => [ext, "dataurl"])),
  outdir: "dist",
};

async function main() {
  try {
    await buildForEnvironments();
    await buildIndex();
    console.log("\tesbuild complete");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

async function buildForEnvironments() {
  ensureDistDir();

  await esbuild.build({
    ...esbuildOptions,
    tsconfig: "tsconfig.node.json",
    platform: "node",
    outdir: "dist/cjs",
    format: "cjs",
  });
  console.log("Node.js esbuild complete");

  await esbuild.build({
    ...esbuildOptions,
    tsconfig: "tsconfig.web.json",
    platform: "browser",
    outdir: "dist/esm",
    format: "esm",
  });
  console.log("Frontend esbuild complete");
}

async function buildIndex() {
  await esbuild.build({
    entryPoints: ["index.ts"],
    bundle: true,
    format: "cjs",
    outfile: "dist/index.js",
  });

  console.log("Index build complete.");
}

function ensureDistDir() {
  const distPath = path.resolve(__dirname, "..", "dist");
  if (!fs.existsSync(distPath)) {
    fs.mkdirSync(distPath, { recursive: true });
  }
}

void createDynamicTypes().then(main).catch(console.error);
