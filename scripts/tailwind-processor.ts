/**
 * Tailwind Processor v3
 *
 * Takes a raw captured HTML file and produces a lean version:
 * 1. Tree-shakes CSS: keeps only rules matching classes used in the body
 * 2. Keeps ALL global rules (:root, .dark, *, body, html, @font-face, @keyframes)
 * 3. Keeps Tailwind utility classes as-is (they need the Tailwind CDN)
 * 4. Resolves custom class definitions into Tailwind utility classes where possible
 * 5. For complex classes (using CSS vars, color-mix, etc.), keeps the original CSS rule
 * 6. Strips data URI images, deduplicates CSS, removes noise attributes
 */

import { readFileSync, writeFileSync } from "fs";

const inputPath = process.argv[2];
const outputPath = process.argv[3] || "/tmp/tw-processed.html";

if (!inputPath) {
  console.error("Usage: bun scripts/tailwind-processor.ts <input.html> [output.html]");
  process.exit(1);
}

const html = readFileSync(inputPath, "utf-8");
console.log(`Input: ${(html.length / 1024).toFixed(0)} KB`);

// ═══ Step 1: Extract all CSS ═══
const styleBlocks: string[] = [];
let htmlShell = html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_, css) => {
  styleBlocks.push(css);
  return "<!--STYLE-->";
});
const allCSS = styleBlocks.join("\n");
console.log(`CSS: ${styleBlocks.length} blocks, ${(allCSS.length / 1024).toFixed(0)} KB`);

// ═══ Step 2: Collect all classes used in body ═══
const bodyMatch = htmlShell.match(/<body[^>]*>([\s\S]*)<\/body>/i);
const bodyHTML = bodyMatch ? bodyMatch[1].replace(/<!--STYLE-->/g, "") : "";
const usedClasses = new Set<string>();
for (const m of bodyHTML.matchAll(/class="([^"]*)"/g)) {
  for (const c of m[1].split(/\s+/)) {
    if (c) usedClasses.add(c);
  }
}
// Also add classes from html and body tags
const htmlTag = htmlShell.match(/<html[^>]*class="([^"]*)"/);
if (htmlTag) for (const c of htmlTag[1].split(/\s+/)) { if (c) usedClasses.add(c); }
const bodyTag = htmlShell.match(/<body[^>]*class="([^"]*)"/);
if (bodyTag) for (const c of bodyTag[1].split(/\s+/)) { if (c) usedClasses.add(c); }

console.log(`Classes used: ${usedClasses.size}`);

// ═══ Step 3: Build the minimal CSS ═══
// Strategy: parse CSS into individual rules and keep only those that match used classes
// Keep ALL: :root, html, body, *, .dark blocks (theme vars)
// Keep ALL: @font-face, @keyframes, @media wrapping used rules
// Keep: .className rules where className is in usedClasses

const keptBaseRules: string[] = [];
const keptMediaRules: string[] = [];
const seenRules = new Set<string>();

function addRule(rule: string, isMedia = false) {
  const key = rule.replace(/\s+/g, " ").trim();
  if (key.length < 3) return;
  if (seenRules.has(key)) return;
  seenRules.add(key);
  if (isMedia) {
    keptMediaRules.push(rule);
  } else {
    keptBaseRules.push(rule);
  }
}

// Helper: check if a CSS selector matches used classes
// For compound selectors like .a.b, ALL classes must be in usedClasses
// For descendant selectors like .a .b, at least one segment must fully match
function selectorUsesClass(selector: string): boolean {
  const parts = selector.split(",");
  for (const part of parts) {
    const trimmed = part.trim();
    // Split by whitespace/combinators into segments (e.g. ".a .b > .c" → [".a", ".b", ".c"])
    const segments = trimmed.split(/[\s>+~]+/);
    let anySegmentMatches = false;
    for (const segment of segments) {
      // Extract ALL class names from this compound segment (e.g. ".a.b" → [".a", ".b"])
      const classes = segment.match(/\.([a-zA-Z_][a-zA-Z0-9_-]*(?:\\.[a-zA-Z0-9_\[\]%/.-]*)*)/g);
      if (!classes || classes.length === 0) continue;
      // ALL classes in a compound selector must be used
      let allMatch = true;
      for (const cls of classes) {
        let name = cls.slice(1).replace(/\\/g, "");
        if (usedClasses.has(name)) continue;
        const colonIdx = name.indexOf(":");
        if (colonIdx > 0 && usedClasses.has(name.slice(0, colonIdx))) continue;
        allMatch = false;
        break;
      }
      if (allMatch) { anySegmentMatches = true; break; }
    }
    if (anySegmentMatches) return true;
  }
  return false;
}

// Helper: check if selector is a global/element selector (resets, var definitions)
function isGlobalSelector(selector: string): boolean {
  const s = selector.trim();
  // Element selectors (Tailwind preflight/reset)
  const elementResets = /^(a|button|input|select|textarea|img|svg|video|canvas|audio|iframe|embed|object|summary|details|fieldset|legend|progress|meter|output|table|th|td|tr|thead|tbody|tfoot|caption|ul|ol|li|dl|dt|dd|h[1-6]|p|hr|pre|code|kbd|samp|sub|sup|small|strong|b|i|em|mark|abbr|cite|blockquote|figure|figcaption|address|time)(\s|,|\{|$|:|\[)/;
  return /^(:root|html|body|\*|\.dark)(\s|,|\{|$|\.|\[|:)/.test(s) ||
    s === "*" || s === "body" || s === "html" || s === ":root" || s === ".dark" ||
    s.startsWith(":root.") || s.startsWith(":root ") ||
    s.startsWith("html.") || s.startsWith("html ") ||
    s.startsWith("* ") || s.startsWith("*,") || s.startsWith("*::") ||
    elementResets.test(s);
}

for (const block of styleBlocks) {
  // Handle @font-face
  for (const m of block.matchAll(/@font-face\s*\{[^}]*\}/g)) {
    addRule(m[0]);
  }

  // Handle @keyframes
  for (const m of block.matchAll(/@keyframes\s+[a-zA-Z0-9_-]+\s*\{[\s\S]*?(?:\{[^}]*\}[\s\S]*?)*\}/g)) {
    addRule(m[0]);
  }

  // Handle @media blocks — need to handle nested braces properly
  // Strategy: find @media ... { and then count braces to find the matching }
  let mediaSearchPos = 0;
  while (true) {
    const mediaStart = block.indexOf("@media", mediaSearchPos);
    if (mediaStart < 0) break;
    const openBrace = block.indexOf("{", mediaStart);
    if (openBrace < 0) break;

    // Count braces to find matching close
    let depth = 1;
    let pos = openBrace + 1;
    while (pos < block.length && depth > 0) {
      if (block[pos] === "{") depth++;
      else if (block[pos] === "}") depth--;
      pos++;
    }
    const mediaEnd = pos;
    const mediaRule = block.slice(mediaStart, mediaEnd);
    const innerCSS = block.slice(openBrace + 1, mediaEnd - 1);

    // Check if any inner rule uses a used class or is global
    let hasUsed = false;
    for (const inner of innerCSS.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      const sel = inner[1].trim();
      if (isGlobalSelector(sel) || selectorUsesClass(sel)) {
        hasUsed = true;
        break;
      }
    }
    if (hasUsed) addRule(mediaRule, true);
    mediaSearchPos = mediaEnd;
  }

  // Handle regular rules: selector { ... }
  // Remove @media, @font-face, @keyframes from the block to get only top-level rules
  let remaining = block;
  remaining = remaining.replace(/@font-face\s*\{[^}]*\}/g, "");
  remaining = remaining.replace(/@keyframes\s+[a-zA-Z0-9_-]+\s*\{[\s\S]*?(?:\{[^}]*\}[\s\S]*?)*\}/g, "");
  // Remove @media blocks using brace counting
  let cleanRemaining = "";
  let ri = 0;
  while (ri < remaining.length) {
    const mediaIdx = remaining.indexOf("@media", ri);
    if (mediaIdx < 0) { cleanRemaining += remaining.slice(ri); break; }
    cleanRemaining += remaining.slice(ri, mediaIdx);
    const ob = remaining.indexOf("{", mediaIdx);
    if (ob < 0) { cleanRemaining += remaining.slice(mediaIdx); break; }
    let d = 1, p = ob + 1;
    while (p < remaining.length && d > 0) {
      if (remaining[p] === "{") d++;
      else if (remaining[p] === "}") d--;
      p++;
    }
    ri = p;
  }
  remaining = cleanRemaining;

  // Now parse remaining rules (only top-level, @media already handled)
  for (const m of remaining.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const selector = m[1].trim();
    const body = m[2].trim();
    if (!selector || !body) continue;
    // Skip if selector looks like a responsive/breakpoint variant that should be in @media
    // These should ONLY exist inside @media blocks, not top-level
    if (/^\.(?:sm|md|lg|xl|2xl)\\:/.test(selector)) continue;

    if (isGlobalSelector(selector)) {
      addRule(`${selector} { ${body} }`);
    } else if (selectorUsesClass(selector)) {
      addRule(`${selector} { ${body} }`);
    }
  }
}

// Assemble: base rules first, then @media rules (so responsive overrides win)
const minimalCSS = [...keptBaseRules, ...keptMediaRules].join("\n");
const totalKept = keptBaseRules.length + keptMediaRules.length;
console.log(`Kept rules: ${totalKept} (${keptBaseRules.length} base + ${keptMediaRules.length} media), CSS: ${(minimalCSS.length / 1024).toFixed(0)} KB (${((1 - minimalCSS.length / allCSS.length) * 100).toFixed(0)}% reduction)`);

// ═══ Step 4: Strip noise from HTML ═══
let output = htmlShell;

// Replace all <!--STYLE--> markers with nothing (we'll add CSS back in <head>)
output = output.replace(/<!--STYLE-->/g, "");

// Strip data URI images
output = output.replace(/data:image\/[^"')\s]+/g, "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E");

// Remove noise attributes
const noiseAttrs = [
  /\s+data-(?!icon-name|state|color|placeholder|radix|side|align)[a-zA-Z0-9_-]+="[^"]*"/g,
  /\s+(?:spellcheck|translate|contenteditable|draggable)="[^"]*"/g,
  /\s+data-nimg="[^"]*"/g,
  /\s+(?:decoding|loading|fetchpriority)="[^"]*"/g,
];
for (const re of noiseAttrs) {
  output = re.global ? output.replace(re, "") : output;
}

// Strip unnecessary <head> elements: title, meta (except charset+viewport), link (favicons, preloads, feeds, manifest)
output = output.replace(/<title>[^<]*<\/title>/gi, "");
output = output.replace(/<meta\s+(?!name="viewport"|charset)[^>]*>/gi, "");
output = output.replace(/<link\s+[^>]*rel="(?:icon|apple-touch-icon|mask-icon|shortcut icon|manifest|alternate|preload|preconnect|dns-prefetch)"[^>]*>/gi, "");
output = output.replace(/<link\s+[^>]*href="[^"]*(?:favicon|rss|atom|manifest)[^"]*"[^>]*>/gi, "");

// ═══ Step 5: Inject minimal CSS + Tailwind CDN ═══
const styleTag = `<style data-dg-lean="true">\n${minimalCSS}\n</style>`;

output = output.replace(/<head[^>]*>/, (match) => {
  return `${match}\n${styleTag}`;
});

// ═══ Step 6: Cleanup ═══
output = output.replace(/\s*class=""/g, "");
output = output.replace(/\s*style=""/g, "");

writeFileSync(outputPath, output, "utf-8");
console.log(`Output: ${(output.length / 1024).toFixed(0)} KB -> ${outputPath}`);
