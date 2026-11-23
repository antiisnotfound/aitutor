// Copies browser-only assets that must be served as static files
// (AudioWorklet processor + lip-sync model) into public/vendor.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  ["node_modules/@met4citizen/headaudio/dist/headworklet.min.mjs", "public/vendor/headaudio/headworklet.min.mjs"],
  ["node_modules/@met4citizen/headaudio/dist/model-en-mixed.bin", "public/vendor/headaudio/model-en-mixed.bin"],
];
for (const [from, to] of files) {
  mkdirSync(dirname(join(root, to)), { recursive: true });
  copyFileSync(join(root, from), join(root, to));
}
console.log(`copied ${files.length} vendor files`);
