import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const html = await (await import("node:fs/promises")).readFile("index.html", "utf8");
const blocks = [...html.matchAll(/<script\\b([^>]*)>([\\s\\S]*?)<\\/script>/gi)];
const tempDir = mkdtempSync(join(tmpdir(), "smss-js-check-"));
let checked = 0;
let failed = false;

try {
  for (let i = 0; i < blocks.length; i++) {
    const attrs = blocks[i][1] || "";
    const source = blocks[i][2] || "";
    if (!source.trim()) continue;

    const isModule = /\\btype\\s*=\\s*["']module["']/i.test(attrs);
    const file = join(tempDir, `inline-${i + 1}.${isModule ? "mjs" : "cjs"}`);
    writeFileSync(file, source, "utf8");

    const result = spawnSync(process.execPath, ["--check", file], {
      encoding: "utf8"
    });
    checked++;

    if (result.status !== 0) {
      failed = true;
      process.stderr.write(`\\nSyntax error in inline script #${i + 1} (${isModule ? "module" : "classic"}):\\n`);
      process.stderr.write(result.stderr || result.stdout || "Unknown parser error\\n");
    }
  }

  if (checked === 0) {
    console.error("No inline JavaScript blocks were found.");
    process.exitCode = 1;
  } else if (failed) {
    console.error(`\\nJavaScript syntax check failed (${checked} inline blocks checked).`);
    process.exitCode = 1;
  } else {
    console.log(`JavaScript syntax check passed (${checked} inline blocks checked).`);
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
