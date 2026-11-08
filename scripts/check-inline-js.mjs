import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const html = await readFile("index.html", "utf8");

// HTML script elements are raw-text elements: a literal <script> inside a
// JavaScript template string does not start a new HTML element. Scan from each
// opening tag to its matching closing tag instead of pairing every opening tag
// with the next closing tag via matchAll (which split certificate/report HTML).
const blocks = [];
const openingTag = /<script\b([^>]*)>/gi;
let opening;
while ((opening = openingTag.exec(html)) !== null) {
  const closingIndex = html.indexOf("</script", openingTag.lastIndex);
  if (closingIndex === -1) {
    throw new Error("Unclosed script element at line " + (html.slice(0, opening.index).split("\n").length));
  }
  const closingEnd = html.indexOf(">", closingIndex);
  if (closingEnd === -1) throw new Error("Malformed closing script tag.");
  blocks.push({
    attrs: opening[1] || "",
    source: html.slice(openingTag.lastIndex, closingIndex)
  });
  openingTag.lastIndex = closingEnd + 1;
}

const tempDir = mkdtempSync(join(tmpdir(), "smss-js-check-"));
let checked = 0;
let failed = false;

try {
  for (let i = 0; i < blocks.length; i++) {
    const attrs = blocks[i].attrs;
    const source = blocks[i].source;
    if (!source.trim()) continue;

    const isModule = /\btype\s*=\s*["']module["']/i.test(attrs);
    const extension = isModule ? "mjs" : "cjs";
    const file = join(tempDir, "inline-" + (i + 1) + "." + extension);
    writeFileSync(file, source, "utf8");

    const result = spawnSync(process.execPath, ["--check", file], {
      encoding: "utf8"
    });
    checked++;

    if (result.status !== 0) {
      failed = true;
      process.stderr.write("\nSyntax error in inline script #" + (i + 1) + " (" + extension + "):\n");
      process.stderr.write(result.stderr || result.stdout || "Unknown parser error\n");
    }
  }

  if (checked === 0) {
    console.error("No inline JavaScript blocks were found.");
    process.exitCode = 1;
  } else if (failed) {
    console.error("\nJavaScript syntax check failed (" + checked + " inline blocks checked).");
    process.exitCode = 1;
  } else {
    console.log("JavaScript syntax check passed (" + checked + " inline blocks checked).");
  }
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
