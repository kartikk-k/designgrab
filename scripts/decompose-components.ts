#!/usr/bin/env bun
/**
 * Decompose Components
 *
 * Takes a captured element HTML file and a component manifest (JSON),
 * extracts each component's subtree by CSS selector, and outputs
 * individual lean Tailwind HTML files.
 *
 * Usage:
 *   bun scripts/decompose-components.ts <capture.html> <components.json> [--outdir ./components]
 *
 * components.json format:
 * [
 *   { "name": "Sidebar", "selector": "[data-slot=\"sidebar\"]", "description": "Main navigation sidebar" },
 *   { "name": "SidebarMenuItem", "selector": "[data-slot=\"sidebar-menu-button\"]:first-of-type", "description": "Single nav item" },
 *   ...
 * ]
 *
 * Or generate the manifest from the outline:
 *   bun scripts/decompose-components.ts <capture.html> --outline
 *   (prints the outline so you can create the manifest)
 */

import { JSDOM } from "jsdom";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, basename } from "path";

// ─── Parse args ───
const args = process.argv.slice(2);
const htmlPath = args[0];

if (!htmlPath) {
  console.log(`
Usage:
  bun scripts/decompose-components.ts <capture.html> <components.json> [--outdir ./components]
  bun scripts/decompose-components.ts <capture.html> --outline

Options:
  --outline    Print the structure outline from the HTML comment
  --outdir     Output directory for component files (default: ./components)
  `);
  process.exit(1);
}

const htmlContent = readFileSync(htmlPath, "utf-8");
const dom = new JSDOM(htmlContent);
const doc = dom.window.document;

// ─── Outline mode ───
if (args.includes("--outline")) {
  // Extract outline from HTML comment
  const commentMatch = htmlContent.match(/<!--\s*STRUCTURE\s*─+\s*([\s\S]*?)-->/);
  if (commentMatch) {
    console.log(commentMatch[1].trim());
  } else {
    // Generate outline from DOM
    console.log(generateOutline(doc.body.firstElementChild as Element));
  }
  process.exit(0);
}

// ─── Component extraction mode ───
const manifestPath = args[1];
if (!manifestPath || manifestPath.startsWith("--")) {
  console.error("Error: components.json path required");
  process.exit(1);
}

const outdir = args.includes("--outdir")
  ? args[args.indexOf("--outdir") + 1]
  : "./components";

const manifest: { name: string; selector: string; description?: string }[] =
  JSON.parse(readFileSync(manifestPath, "utf-8"));

// Extract <head> content for the wrapper
const headContent = (() => {
  const headMatch = htmlContent.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  return headMatch ? headMatch[1] : "";
})();

// Extract page background — resolve CSS variable if needed
const bodyEl = doc.body;
const bodyClasses = bodyEl?.getAttribute("class") || "";
const bgMatch = bodyClasses.match(/bg-\[([^\]]+)\]/);
let pageBg = bgMatch ? bgMatch[1].replace(/_/g, " ") : "rgb(20, 20, 20)";
// If it's a CSS variable reference, try to resolve from @theme
if (pageBg.includes("var(")) {
  const varName = pageBg.match(/var\(([^)]+)\)/)?.[1];
  if (varName) {
    const themeMatch = htmlContent.match(new RegExp(varName.replace("--", "--") + "\\s*:\\s*([^;]+)"));
    if (themeMatch) pageBg = themeMatch[1].trim();
  }
}

// Ensure output directory exists
if (!existsSync(outdir)) {
  mkdirSync(outdir, { recursive: true });
}

console.log(`\n  \x1b[36m\x1b[1mDecompose Components\x1b[0m`);
console.log(`  \x1b[2mSource:  ${htmlPath}\x1b[0m`);
console.log(`  \x1b[2mOutput:  ${outdir}/\x1b[0m`);
console.log(`  \x1b[2mComponents: ${manifest.length}\x1b[0m\n`);

const results: { name: string; file: string; sizeKB: string; elements: number }[] = [];

for (const comp of manifest) {
  try {
    const el = doc.querySelector(comp.selector);
    if (!el) {
      console.log(`  \x1b[33m!\x1b[0m ${comp.name} — selector not found: ${comp.selector}`);
      continue;
    }

    const clone = el.cloneNode(true) as Element;

    // Count elements
    const elementCount = clone.querySelectorAll("*").length + 1;

    // Build the component HTML
    const componentHtml = buildComponentHtml(clone, comp, headContent, pageBg);

    // Write file
    const fileName = `${toKebab(comp.name)}.html`;
    const filePath = join(outdir, fileName);
    writeFileSync(filePath, componentHtml, "utf-8");

    const sizeKB = (componentHtml.length / 1024).toFixed(1);
    results.push({ name: comp.name, file: fileName, sizeKB, elements: elementCount });
    console.log(`  \x1b[32m+\x1b[0m ${comp.name} → ${fileName} (${sizeKB}KB, ${elementCount} elements)`);
  } catch (err: any) {
    console.log(`  \x1b[31mx\x1b[0m ${comp.name} — ${err.message}`);
  }
}

// Write summary
console.log(`\n  \x1b[32mDone!\x1b[0m ${results.length}/${manifest.length} components extracted\n`);

// Write index file
const indexHtml = buildIndexHtml(results, manifest, pageBg, headContent);
writeFileSync(join(outdir, "index.html"), indexHtml, "utf-8");
console.log(`  \x1b[2mIndex:   ${outdir}/index.html\x1b[0m`);

// Serve if --serve flag
if (args.includes("--serve")) {
  const { createServer } = await import("http");
  const servePort = 9877;
  const server = createServer((req, res) => {
    const filePath = join(outdir, req.url === "/" ? "index.html" : req.url || "");
    if (!existsSync(filePath)) { res.writeHead(404); res.end("Not found"); return; }
    const ext = filePath.split(".").pop();
    const mime: Record<string, string> = { html: "text/html", png: "image/png", css: "text/css", js: "application/javascript" };
    res.writeHead(200, { "Content-Type": mime[ext || ""] || "text/plain" });
    res.end(readFileSync(filePath));
  });
  server.listen(servePort, () => {
    console.log(`  \x1b[36mServing: http://localhost:${servePort}\x1b[0m\n`);
  });
} else {
  console.log(`  \x1b[2mTip: add --serve to preview in browser\x1b[0m\n`);
}

// ─── Helpers ───

function buildComponentHtml(
  el: Element,
  comp: { name: string; description?: string },
  head: string,
  bg: string
): string {
  const tw = '<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4">' + '<' + '/script>';
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${comp.name}</title>
${tw}
<style type="text/tailwindcss">
@theme {
  --color-page-bg: ${bg};
}
</style>
<style>
body { background: ${bg} !important; color: rgba(255,255,255,0.9); font-family: system-ui, sans-serif; }
</style>
${extractStyles(head)}
</head>
<!-- Component: ${comp.name} -->
<!-- ${comp.description || ""} -->
<body class="flex items-center justify-center min-h-screen p-10 bg-[var(--color-page-bg)]">
${el.outerHTML}
</body>
</html>`;
}

function extractStyles(head: string): string {
  const styles: string[] = [];
  const styleMatches = head.match(/<style[^>]*>[\s\S]*?<\/style>/gi) || [];
  for (const s of styleMatches) {
    // Only keep @font-face rules and tailwind theme styles, skip bulk CSS
    if (s.includes("@font-face") || s.includes("@theme") || s.includes("tailwindcss")) {
      styles.push(s);
    } else if (s.length < 2000) {
      // Keep small style blocks (likely component-specific)
      styles.push(s);
    }
    // Skip large style blocks (full page CSS dumps from page captures)
  }
  return styles.join("\n");
}

function buildIndexHtml(
  results: { name: string; file: string; sizeKB: string; elements: number }[],
  manifest: { name: string; description?: string }[],
  bg: string,
  head: string
): string {
  const cards = results.map((r) => {
    const desc = manifest.find((m) => toKebab(m.name) === r.file.replace(".html", ""))?.description || "";
    return `
    <a href="${r.file}" class="block p-4 rounded-lg bg-white/5 border border-white/8 hover:bg-white/8 transition-colors">
      <div class="font-medium text-white/90">${r.name}</div>
      <div class="text-sm text-white/50 mt-1">${desc}</div>
      <div class="text-xs text-white/30 mt-2">${r.sizeKB}KB · ${r.elements} elements</div>
    </a>`;
  }).join("\n");

  const tw = '<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4">' + '<' + '/script>';
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Components</title>
${tw}
<style>body { background: ${bg} !important; }</style>
</head>
<body class="p-10 text-white" style="font-family:system-ui,sans-serif;">
<div class="max-w-[600px] mx-auto">
  <h1 class="text-2xl font-semibold mb-2">Components</h1>
  <p class="text-sm text-white/50 mb-6">${results.length} components extracted</p>
  <div class="flex flex-col gap-3">
    ${cards}
  </div>
</div>
</body>
</html>`;
}

function toKebab(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
}

function generateOutline(el: Element | null, depth = 0): string {
  if (!el) return "";
  const lines: string[] = [];
  walkNode(el, depth, lines);
  return lines.join("\n");
}

function walkNode(el: Element, depth: number, lines: string[]) {
  const tag = el.tagName.toLowerCase();
  if (tag === "script" || tag === "style") return;

  const indent = "    ".repeat(depth);
  const attrs: string[] = [];

  const id = el.id;
  if (id) attrs.push(`#${id}`);

  const slot = el.getAttribute("data-slot");
  if (slot) attrs.push(`[data-slot="${slot}"]`);

  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) attrs.push(`aria="${ariaLabel}"`);

  const role = el.getAttribute("role");
  if (role) attrs.push(`role="${role}"`);

  const text = getDirectText(el);
  const textPart = text ? ` "${text}"` : "";
  const attrPart = attrs.length ? ` -- ${attrs.join(", ")}` : "";

  lines.push(`${indent}<${tag}>${attrPart}${textPart}`);

  for (const child of el.children) {
    if (child.tagName.toLowerCase() === "svg") {
      lines.push(`${indent}    <svg> -- icon`);
      continue;
    }
    walkNode(child, depth + 1, lines);
  }
}

function getDirectText(el: Element): string {
  let text = "";
  for (const node of el.childNodes) {
    if (node.nodeType === 3) {
      const t = (node.textContent || "").trim();
      if (t) text += t + " ";
    }
  }
  text = text.trim();
  if (text.length > 30) text = text.substring(0, 27) + "...";
  return text;
}
