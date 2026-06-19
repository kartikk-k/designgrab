// ─── Element Capture ─────────────────────────────
// Injected into the page to let the user pick an element,
// then extracts it with computed styles inlined (minimal).

(function () {
  if (window.__DG_ELEMENT_PICKER__) return;
  window.__DG_ELEMENT_PICKER__ = true;

  const overlay = document.createElement("div");
  overlay.id = "__dg-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    pointerEvents: "none",
    border: "2px solid #0171e3",
    background: "rgba(1, 113, 227, 0.08)",
    borderRadius: "4px",
    zIndex: "2147483647",
    transition: "all 0.1s ease",
    display: "none",
  });
  document.body.appendChild(overlay);

  const label = document.createElement("div");
  Object.assign(label.style, {
    position: "fixed",
    zIndex: "2147483647",
    background: "#0171e3",
    color: "#fff",
    fontSize: "11px",
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
    padding: "2px 8px",
    borderRadius: "3px",
    pointerEvents: "none",
    whiteSpace: "nowrap",
    display: "none",
  });
  document.body.appendChild(label);

  let hoveredEl = null;
  let locked = false; // when true, mouse movement doesn't change selection

  function updateOverlay(el) {
    if (!el || el === document.body || el === document.documentElement) {
      overlay.style.display = "none";
      label.style.display = "none";
      return;
    }
    const rect = el.getBoundingClientRect();
    Object.assign(overlay.style, {
      display: "block",
      top: rect.top + "px",
      left: rect.left + "px",
      width: rect.width + "px",
      height: rect.height + "px",
    });
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : "";
    const cls = el.className && typeof el.className === "string"
      ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".") : "";
    const depth = getDepth(el);
    const navHint = locked ? " [locked]" : "";
    label.textContent = `${tag}${id}${cls}  ${Math.round(rect.width)}x${Math.round(rect.height)}  d:${depth}${navHint}`;
    label.style.display = "block";
    label.style.left = rect.left + "px";
    label.style.top = Math.max(0, rect.top - 24) + "px";
  }

  function getDepth(el) {
    let d = 0, n = el;
    while (n && n !== document.body) { d++; n = n.parentElement; }
    return d;
  }

  function onMouseMove(e) {
    if (locked) return; // arrow keys are active, ignore mouse
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el && el !== overlay && el !== label && el !== hoveredEl) {
      hoveredEl = el;
      updateOverlay(el);
    }
  }

  function cleanup() {
    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("keydown", onKeyDown, true);
    overlay.remove();
    label.remove();
    window.__DG_ELEMENT_PICKER__ = false;
  }

  function onKeyDown(e) {
    if (e.key === "Escape") {
      if (locked) {
        // Unlock first, return to mouse-follow mode
        locked = false;
        updateOverlay(hoveredEl);
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      cleanup();
      console.log('[DG] Element picker cancelled');
      return;
    }

    if (!hoveredEl) return;

    // Arrow Up → select parent element
    if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      locked = true;
      const parent = hoveredEl.parentElement;
      if (parent && parent !== document.body && parent !== document.documentElement) {
        hoveredEl = parent;
        updateOverlay(hoveredEl);
      }
      return;
    }

    // Arrow Down → select first child element
    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      locked = true;
      const firstChild = hoveredEl.firstElementChild;
      if (firstChild) {
        hoveredEl = firstChild;
        updateOverlay(hoveredEl);
      }
      return;
    }

    // Arrow Left → select previous sibling
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      e.stopPropagation();
      locked = true;
      const prev = hoveredEl.previousElementSibling;
      if (prev) {
        hoveredEl = prev;
        updateOverlay(hoveredEl);
      }
      return;
    }

    // Arrow Right → select next sibling
    if (e.key === "ArrowRight") {
      e.preventDefault();
      e.stopPropagation();
      locked = true;
      const next = hoveredEl.nextElementSibling;
      if (next) {
        hoveredEl = next;
        updateOverlay(hoveredEl);
      }
      return;
    }

    // Enter → capture current element
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      captureCurrentElement();
      return;
    }
  }

  async function captureCurrentElement() {
    const el = hoveredEl;
    cleanup();
    if (!el) return;

    try {
      const result = extractElement(el);
      console.log('[DG] Element captured:', result.tag, result.dimensions, result.sizeKB + 'KB');
      console.log('[DG] Structure:\n' + result.outline);
      console.log('[DG] Element HTML:\n', result.html);

      // Send directly to server
      const ctx = window.__DG_CAPTURE_CTX__;
      if (!ctx || !ctx.serverUrl) {
        console.warn('[DG] No capture context found, storing result on window');
        window.__DG_ELEMENT_RESULT__ = result;
        return;
      }

      const res = await fetch(`${ctx.serverUrl}/capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: ctx.pageUrl,
          data: result.html,
          title: ctx.pageTitle,
          timestamp: Date.now(),
          captureType: "element",
          elementTag: result.tag,
          elementDimensions: result.dimensions,
        }),
      });

      const serverResult = await res.json();
      if (serverResult.error) {
        console.error('[DG] Server error:', serverResult.error);
      } else {
        console.log(`[DG] Saved: ${serverResult.site}/${serverResult.filename} (${serverResult.sizeKB}KB)`);
      }
    } catch (err) {
      console.error('[DG] Capture error:', err.message);
    }
  }

  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    captureCurrentElement();
  }

  document.addEventListener("mousemove", onMouseMove, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKeyDown, true);

  // ─── Extraction Logic ──────────────────────────

  // Only these properties are worth capturing — everything else is noise.
  // Organized by category for clarity.
  const STYLE_PROPS = [
    // Layout
    "display", "position", "top", "right", "bottom", "left",
    "width", "height", "min-width", "max-width", "min-height", "max-height",
    "margin-top", "margin-right", "margin-bottom", "margin-left",
    "padding-top", "padding-right", "padding-bottom", "padding-left",
    "overflow-x", "overflow-y", "float", "clear",
    "z-index", "opacity", "visibility",
    // Flex
    "flex-direction", "flex-wrap", "flex-grow", "flex-shrink", "flex-basis",
    "justify-content", "align-items", "align-self", "align-content",
    "row-gap", "column-gap", "order",
    // Grid (only include when display is grid)
    "grid-template-columns", "grid-template-rows", "grid-auto-flow",
    // Typography
    "color", "font-family", "font-size", "font-weight", "font-style",
    "line-height", "letter-spacing", "text-align", "text-transform",
    "text-overflow", "white-space", "word-break",
    "text-decoration-line", "text-indent", "text-shadow",
    "-webkit-font-smoothing", "-webkit-text-fill-color",
    // Background
    "background-color", "background-image", "background-size",
    "background-position", "background-repeat", "background-clip",
    "-webkit-background-clip",
    // Border
    "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
    "border-top-style", "border-right-style", "border-bottom-style", "border-left-style",
    "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
    "border-top-left-radius", "border-top-right-radius",
    "border-bottom-left-radius", "border-bottom-right-radius",
    // Effects
    "box-shadow", "filter", "backdrop-filter", "mix-blend-mode",
    "transform",
    // SVG
    "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin",
    "clip-path",
    // Misc
    "cursor", "pointer-events", "user-select", "vertical-align",
    "list-style-type", "content",
    "color-scheme", "aspect-ratio", "object-fit", "object-position",
  ];

  // Properties that are inherited — skip on children if same as parent
  const INHERITED = new Set([
    "color", "font-family", "font-size", "font-weight", "font-style",
    "line-height", "letter-spacing", "text-align", "text-transform",
    "white-space", "word-break", "word-spacing", "text-indent",
    "-webkit-font-smoothing", "-webkit-text-fill-color",
    "cursor", "visibility", "list-style", "list-style-type",
    "color-scheme",
  ]);

  // SVG elements that don't need most CSS properties
  const SVG_TAGS = new Set([
    "svg", "g", "path", "circle", "rect", "line", "polyline", "polygon",
    "ellipse", "text", "tspan", "defs", "clippath", "mask", "use",
    "lineargradient", "radialgradient", "stop", "symbol", "marker",
    "pattern", "image", "foreignobject",
  ]);

  // Only these matter on SVG internal elements
  const SVG_PROPS = new Set([
    "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin",
    "opacity", "visibility", "clip-path", "transform",
    "color", "filter",
  ]);

  // Default values to skip (multi-value for some props)
  const SKIP_VALUES_MAP = {
    "position": ["static"],
    "top": ["auto"], "right": ["auto"], "bottom": ["auto"], "left": ["auto"],
    "width": ["auto"], "height": ["auto"],
    "min-width": ["auto", "0px"], "max-width": ["none"],
    "min-height": ["auto", "0px"], "max-height": ["none"],
    "margin-top": ["0px"], "margin-right": ["0px"], "margin-bottom": ["0px"], "margin-left": ["0px"],
    "padding-top": ["0px"], "padding-right": ["0px"], "padding-bottom": ["0px"], "padding-left": ["0px"],
    "overflow-x": ["visible"], "overflow-y": ["visible"],
    "float": ["none"], "clear": ["none"],
    "z-index": ["auto"], "opacity": ["1"], "visibility": ["visible"],
    "flex-direction": ["row"], "flex-wrap": ["nowrap"],
    "flex-grow": ["0"], "flex-shrink": ["1"], "flex-basis": ["auto"],
    "justify-content": ["normal"], "align-items": ["normal"],
    "align-self": ["auto"], "align-content": ["normal"],
    "row-gap": ["normal", "0px"], "column-gap": ["normal", "0px"],
    "order": ["0"],
    "grid-template-columns": ["none"], "grid-template-rows": ["none"],
    "grid-auto-flow": ["row"],
    "text-align": ["start"], "text-transform": ["none"],
    "text-overflow": ["clip"], "white-space": ["normal"],
    "word-break": ["normal"],
    "text-indent": ["0px"], "text-shadow": ["none"],
    "font-style": ["normal"],
    "background-color": ["rgba(0, 0, 0, 0)", "transparent"],
    "background-image": ["none"], "background-size": ["auto"],
    "background-position": ["0% 0%"], "background-repeat": ["repeat"],
    "background-clip": ["border-box"],
    "-webkit-background-clip": ["border-box"],
    "border-top-width": ["0px"], "border-right-width": ["0px"],
    "border-bottom-width": ["0px"], "border-left-width": ["0px"],
    "border-top-left-radius": ["0px"], "border-top-right-radius": ["0px"],
    "border-bottom-left-radius": ["0px"], "border-bottom-right-radius": ["0px"],
    "box-shadow": ["none"], "filter": ["none"], "backdrop-filter": ["none"],
    "mix-blend-mode": ["normal"],
    "transform": ["none", "matrix(1, 0, 0, 1, 0, 0)"],
    "cursor": ["auto"], "pointer-events": ["auto"], "user-select": ["auto"],
    "vertical-align": ["baseline"],
    "list-style-type": ["disc", "none"],
    "content": ["normal", "none", '""'],
    "fill": ["rgb(0, 0, 0)"], "stroke": ["none"], "stroke-width": ["1px"],
    "stroke-linecap": ["butt"], "stroke-linejoin": ["miter"],
    "clip-path": ["none"],
    "text-decoration-line": ["none"],
    "-webkit-font-smoothing": ["auto"],
    "color-scheme": ["normal"],
    "aspect-ratio": ["auto"], "object-fit": ["fill"], "object-position": ["50% 50%"],
    "box-sizing": ["content-box"],
  };

  function isDefaultValue(prop, value) {
    const defaults = SKIP_VALUES_MAP[prop];
    return defaults && defaults.includes(value);
  }

  function collapseOverflow(parts) {
    const xi = parts.findIndex(p => p.startsWith("overflow-x:"));
    const yi = parts.findIndex(p => p.startsWith("overflow-y:"));
    if (xi === -1 && yi === -1) return;
    const xv = xi !== -1 ? parts[xi].split(":")[1] : "visible";
    const yv = yi !== -1 ? parts[yi].split(":")[1] : "visible";
    // Remove longhands
    for (const idx of [xi, yi].filter(i => i !== -1).sort((a, b) => b - a)) parts.splice(idx, 1);
    if (xv === yv) {
      if (xv !== "visible") parts.push(`overflow:${xv}`);
    } else {
      if (xv !== "visible") parts.push(`overflow-x:${xv}`);
      if (yv !== "visible") parts.push(`overflow-y:${yv}`);
    }
  }

  function collapseGap(parts) {
    const ri = parts.findIndex(p => p.startsWith("row-gap:"));
    const ci = parts.findIndex(p => p.startsWith("column-gap:"));
    if (ri === -1 && ci === -1) return;
    const rv = ri !== -1 ? parts[ri].split(":")[1] : null;
    const cv = ci !== -1 ? parts[ci].split(":")[1] : null;
    if (rv && cv && rv === cv) {
      for (const idx of [ri, ci].sort((a, b) => b - a)) parts.splice(idx, 1);
      parts.push(`gap:${rv}`);
    }
  }

  function collapseRadius(parts) {
    const corners = ["border-top-left-radius", "border-top-right-radius",
                     "border-bottom-right-radius", "border-bottom-left-radius"];
    const found = corners.map(c => parts.findIndex(p => p.startsWith(c + ":")));
    if (found.some(idx => idx === -1)) return;
    const vals = found.map(idx => parts[idx].split(":")[1]);
    let shortVal;
    if (vals[0] === vals[1] && vals[1] === vals[2] && vals[2] === vals[3]) {
      shortVal = vals[0];
    } else {
      shortVal = vals.join(" ");
    }
    for (const idx of found.sort((a, b) => b - a)) parts.splice(idx, 1);
    parts.push(`border-radius:${shortVal}`);
  }

  function collapseBox(parts, prefix) {
    const sides = ["top", "right", "bottom", "left"];
    const found = sides.map(s => parts.findIndex(p => p.startsWith(`${prefix}-${s}:`)));
    if (found.some(idx => idx === -1)) return;
    const vals = found.map(idx => parts[idx].split(":")[1]);
    // All same → single value; T/B same + L/R same → two values; else four
    let shortVal;
    if (vals[0] === vals[1] && vals[1] === vals[2] && vals[2] === vals[3]) {
      shortVal = vals[0];
    } else if (vals[0] === vals[2] && vals[1] === vals[3]) {
      shortVal = `${vals[0]} ${vals[1]}`;
    } else {
      shortVal = vals.join(" ");
    }
    // Remove longhands (reverse order to preserve indices)
    for (const idx of found.sort((a, b) => b - a)) parts.splice(idx, 1);
    parts.push(`${prefix}:${shortVal}`);
  }

  function extractElement(el) {
    const baseURI = document.baseURI;
    const allEls = [el, ...el.querySelectorAll("*")];

    // Collect fonts used
    const usedFontFamilies = new Set();
    for (const e of allEls) {
      const cs = window.getComputedStyle(e);
      if (cs.fontFamily) {
        cs.fontFamily.split(",").forEach(f =>
          usedFontFamilies.add(f.trim().replace(/['"]/g, "").toLowerCase())
        );
      }
    }

    // Collect @font-face — only the Latin subset per family
    const fontFaceCandidates = new Map(); // family -> { latin: rule, first: rule }
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; }
      for (const rule of rules) {
        if (!(rule instanceof CSSFontFaceRule)) continue;
        const family = rule.style.getPropertyValue("font-family").replace(/['"]/g, "").toLowerCase();
        if (!usedFontFamilies.has(family)) continue;

        const range = rule.style.getPropertyValue("unicode-range");
        const isLatin = !range || range.includes("U+0-FF") || range.includes("U+0-");

        let cssText = rule.cssText;
        const base = sheet.href || baseURI;
        cssText = cssText.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, ref) => {
          if (/^(data:|https?:)/i.test(ref)) return m;
          try { return 'url("' + new URL(ref, base).href + '")'; }
          catch { return m; }
        });

        if (!fontFaceCandidates.has(family)) fontFaceCandidates.set(family, {});
        const entry = fontFaceCandidates.get(family);
        if (isLatin) entry.latin = cssText;
        else if (!entry.first) entry.first = cssText;
      }
    }
    const fontFaceRules = [];
    for (const [, entry] of fontFaceCandidates) {
      fontFaceRules.push(entry.latin || entry.first);
    }

    // Collect pseudo-element styles
    const pseudoStyles = new Map();
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; }
      collectPseudoRules(rules, allEls, pseudoStyles);
    }

    function collectPseudoRules(rules, elements, map) {
      for (const rule of rules) {
        if (rule.cssRules) { collectPseudoRules(rule.cssRules, elements, map); continue; }
        if (!(rule instanceof CSSStyleRule)) continue;
        const sel = rule.selectorText;
        if (!sel) continue;
        let pseudo = null, baseSel = sel;
        if (sel.includes("::before")) { pseudo = "before"; baseSel = sel.replace(/::before/g, "").trim(); }
        else if (sel.includes("::after")) { pseudo = "after"; baseSel = sel.replace(/::after/g, "").trim(); }
        if (!pseudo || !baseSel) continue;
        for (let i = 0; i < elements.length; i++) {
          try {
            if (!elements[i].matches(baseSel)) continue;
            const cs = window.getComputedStyle(elements[i], "::" + pseudo);
            const content = cs.content;
            // Skip only if truly no content — allow empty strings (icon fonts use them)
            if (content === "none" || content === "normal") continue;
            if (!map.has(i)) map.set(i, {});
            map.get(i)[pseudo] = true;
          } catch {}
        }
      }
    }

    // Clone and inline
    const clone = el.cloneNode(true);
    const cloneEls = [clone, ...clone.querySelectorAll("*")];
    const pseudoCSS = [];

    // Compute parent styles for inheritance dedup
    // parentStyles[i] = computed style values of element i's parent
    // For root (i=0), parent is the page context
    const rootComputed = window.getComputedStyle(el.parentElement || document.body);
    const parentComputedMap = new Map(); // original element -> its computed styles object
    parentComputedMap.set(allEls[0], rootComputed);

    for (let i = 0; i < cloneEls.length; i++) {
      const original = allEls[i];
      const cloned = cloneEls[i];
      if (!original || !cloned) continue;

      const computed = window.getComputedStyle(original);
      const tag = original.tagName.toLowerCase();
      const isSvgInternal = SVG_TAGS.has(tag) && tag !== "svg";
      const parentComputed = i === 0 ? rootComputed : window.getComputedStyle(original.parentElement);
      const display = computed.getPropertyValue("display");

      // Remove hidden elements entirely from output
      if (display === "none" && i > 0) {
        cloned.remove();
        continue;
      }

      const parts = [];
      const propsToCheck = isSvgInternal ? SVG_PROPS : STYLE_PROPS;
      const isGrid = display.includes("grid");
      const parentDisplay = parentComputed.getPropertyValue("display");
      const parentIsFlex = parentDisplay === "flex" || parentDisplay === "inline-flex";

      for (const prop of propsToCheck) {
        // Skip grid props on non-grid elements
        if (prop.startsWith("grid-") && !isGrid) continue;

        const value = computed.getPropertyValue(prop);
        if (!value) continue;

        // Skip default/initial values
        if (isDefaultValue(prop, value)) continue;

        // Skip default display for the tag
        if (prop === "display") {
          const BLOCK_TAGS = new Set(["div","section","article","aside","header","footer","main","nav","p","h1","h2","h3","h4","h5","h6","ul","ol","li","blockquote","pre","figure","figcaption","details","summary","form","fieldset","table","hr","address","dl","dt","dd"]);
          const INLINE_TAGS = new Set(["span","a","strong","em","b","i","u","s","small","sub","sup","mark","abbr","cite","code","kbd","var","samp","q","label","time","data","ruby"]);
          if (value === "block" && BLOCK_TAGS.has(tag)) continue;
          if (value === "inline" && INLINE_TAGS.has(tag)) continue;
          if (value === "list-item" && tag === "li") continue;
        }

        // Skip auto-computed width/height on children
        if ((prop === "width" || prop === "height") && i > 0) {
          const inl = original.style;
          const hasExplicit = prop === "width"
            ? (inl.width || inl.minWidth || inl.maxWidth)
            : (inl.height || inl.minHeight || inl.maxHeight);
          if (!hasExplicit) {
            // Block elements auto-fill width, skip
            if (display === "block") continue;
            // Flex children: skip width (flex sizes it), but keep height for replaced/interactive elements
            if (parentIsFlex) {
              if (prop === "width") continue;
              // Keep height only on elements that need it (buttons, inputs, images)
              const NEEDS_HEIGHT = new Set(["button","input","select","textarea","img","video","canvas","svg"]);
              if (prop === "height" && !NEEDS_HEIGHT.has(tag)) continue;
            }
          }
        }

        // For SVG: skip fill/stroke/color if same as parent
        if (isSvgInternal && (prop === "fill" || prop === "stroke" || prop === "color")) {
          const parentVal = parentComputed.getPropertyValue(prop);
          if (parentVal === value) continue;
        }

        // For SVG: skip any prop that has a corresponding HTML/SVG attribute
        // (the attribute is sufficient — the inline style is just the browser's resolved form)
        if (isSvgInternal && original.hasAttribute(prop)) continue;

        // For borders: skip color/style if width is 0
        if ((prop.endsWith("-color") || prop.endsWith("-style")) && prop.startsWith("border-")) {
          const widthProp = prop.replace(/-color$/, "-width").replace(/-style$/, "-width");
          const w = computed.getPropertyValue(widthProp);
          if (!w || w === "0px") continue;
        }

        // Skip text-decoration-line "none"
        if (prop === "text-decoration-line" && value === "none") continue;

        // Skip transparent backgrounds
        if (prop === "background-color" && (value === "rgba(0, 0, 0, 0)" || value === "transparent")) continue;

        // Skip box-shadow — drop fully transparent entries, keep the rest
        if (prop === "box-shadow" && value !== "none") {
          const entries = value.split(/,(?![^(]*\))/);
          const meaningful = entries.filter(s =>
            !s.includes("rgba(0, 0, 0, 0)") && !s.includes("transparent")
          );
          if (meaningful.length === 0) continue;
          parts.push(`${prop}:${meaningful.join(",").trim()}`);
          continue;
        }

        // Skip inherited props if same as parent
        if (INHERITED.has(prop) && i > 0) {
          const parentVal = parentComputed.getPropertyValue(prop);
          if (parentVal === value) continue;
        }

        // Skip -webkit-text-fill-color if same as color
        if (prop === "-webkit-text-fill-color") {
          if (value === computed.getPropertyValue("color")) continue;
        }

        // Skip -webkit-background-clip if border-box (default)
        if (prop === "-webkit-background-clip" && value === "border-box") continue;

        // Skip overflow-x/y if visible (default)
        if ((prop === "overflow-x" || prop === "overflow-y") && value === "visible") continue;

        // Skip row-gap/column-gap if 0px or normal
        if ((prop === "row-gap" || prop === "column-gap") && (value === "0px" || value === "normal")) continue;

        parts.push(`${prop}:${value}`);
      }

      // Collapse border longhands into shorthand if all 4 sides are identical
      const bw = parts.filter(p => p.startsWith("border-") && p.includes("-width:"));
      const bs = parts.filter(p => p.startsWith("border-") && p.includes("-style:"));
      const bc = parts.filter(p => p.startsWith("border-") && p.includes("-color:"));
      if (bw.length === 4 && bs.length === 4 && bc.length === 4) {
        const widthVals = new Set(bw.map(p => p.split(":")[1]));
        const styleVals = new Set(bs.map(p => p.split(":")[1]));
        const colorVals = new Set(bc.map(p => p.split(":")[1]));
        if (widthVals.size === 1 && styleVals.size === 1 && colorVals.size === 1) {
          // Remove the 12 longhand entries and add one shorthand
          const borderShorthand = `border:${[...widthVals][0]} ${[...styleVals][0]} ${[...colorVals][0]}`;
          for (let j = parts.length - 1; j >= 0; j--) {
            if (parts[j].startsWith("border-") && (parts[j].includes("-width:") || parts[j].includes("-style:") || parts[j].includes("-color:"))) {
              parts.splice(j, 1);
            }
          }
          parts.push(borderShorthand);
        }
      }

      // Collapse padding longhands into shorthand
      collapseBox(parts, "padding");
      // Collapse margin longhands into shorthand
      collapseBox(parts, "margin");
      // Collapse border-radius
      collapseRadius(parts);
      // Collapse overflow-x + overflow-y into overflow
      collapseOverflow(parts);
      // Collapse row-gap + column-gap into gap
      collapseGap(parts);

      // Also capture CSS custom properties from inline style
      const inlineStyle = original.getAttribute("style");
      if (inlineStyle) {
        const varMatches = inlineStyle.match(/(--[\w-]+)\s*:\s*([^;]+)/g);
        if (varMatches) {
          for (const m of varMatches) parts.push(m.trim());
        }
      }

      // For SVG elements, always set width/height attributes to computed values
      // (CSS classes that sized them are stripped, and original attributes may be wrong)
      if (tag === "svg") {
        const w = computed.getPropertyValue("width");
        const h = computed.getPropertyValue("height");
        if (w && w !== "auto") cloned.setAttribute("width", parseFloat(w));
        if (h && h !== "auto") cloned.setAttribute("height", parseFloat(h));
      }

      // Set or remove style attribute
      if (parts.length > 0) {
        cloned.setAttribute("style", parts.join(";"));
      } else {
        cloned.removeAttribute("style");
      }
      cloned.removeAttribute("class");

      // Always assign data-dg-id (needed for hover/pseudo CSS targeting)
      cloned.setAttribute("data-dg-id", "dg-" + i);

      // Pseudo-elements
      if (pseudoStyles.has(i)) {
        const id = "dg-" + i;
        const ps = pseudoStyles.get(i);
        if (ps.before) {
          const cs = window.getComputedStyle(original, "::before");
          pseudoCSS.push(`[data-dg-id="${id}"]::before { ${getPseudoStyle(cs)} }`);
        }
        if (ps.after) {
          const cs = window.getComputedStyle(original, "::after");
          pseudoCSS.push(`[data-dg-id="${id}"]::after { ${getPseudoStyle(cs)} }`);
        }
      }
    }

    // Collect :hover, :focus, :active rules
    const interactiveCSS = [];
    const interactivePseudoRe = /:(hover|focus|focus-visible|focus-within|active)/;

    let _hoverScanned = 0, _hoverMatched = 0;
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; }
      gatherInteractiveRules(rules, interactiveCSS);
    }
    console.log(`[DG] Hover: scanned ${_hoverScanned} rules, matched ${_hoverMatched}`);

    function gatherInteractiveRules(rules, output) {
      for (const rule of rules) {
        // Recurse into @media, @supports, etc.
        if (rule.cssRules) { gatherInteractiveRules(rule.cssRules, output); continue; }
        if (!(rule instanceof CSSStyleRule)) continue;
        const fullSel = rule.selectorText;
        if (!fullSel || !interactivePseudoRe.test(fullSel)) continue;
        if (!rule.style.cssText || !rule.style.cssText.trim()) continue;

        _hoverScanned++;
        // Handle comma-separated selectors independently
        const selectors = fullSel.split(",").map(s => s.trim());
        for (const sel of selectors) {
          if (!interactivePseudoRe.test(sel)) continue;

          // Extract which pseudo-classes are used (e.g. ":hover", ":focus-visible")
          const pseudos = [];
          sel.replace(/:(hover|focus-visible|focus-within|focus|active)/g, (m) => { pseudos.push(m); return ""; });
          if (!pseudos.length) continue;
          const pseudoPart = pseudos.join("");

          // Strip pseudo-classes to get a matchable base selector
          const baseSel = sel.replace(/:(hover|focus-visible|focus-within|focus|active)/g, "").trim();
          if (!baseSel) continue;

          // Try to match against our elements
          for (let i = 0; i < allEls.length; i++) {
            const cloned = cloneEls[i];
            if (!cloned || !cloned.parentNode) continue; // removed (display:none)
            try {
              if (!allEls[i].matches(baseSel)) continue;
              _hoverMatched++;
              const id = "dg-" + i;
              output.push(`[data-dg-id="${id}"]${pseudoPart} { ${rule.style.cssText} }`);
              break;
            } catch {}
          }
        }
      }
    }

    // Strip data-dg-id from elements that don't need it (no pseudo/hover CSS targets them)
    const usedDgIds = new Set();
    for (const rule of pseudoCSS) {
      const m = rule.match(/data-dg-id="([^"]+)"/);
      if (m) usedDgIds.add(m[1]);
    }
    for (const rule of interactiveCSS) {
      const m = rule.match(/data-dg-id="([^"]+)"/);
      if (m) usedDgIds.add(m[1]);
    }
    for (const el of [clone, ...clone.querySelectorAll("[data-dg-id]")]) {
      const id = el.getAttribute("data-dg-id");
      if (id && !usedDgIds.has(id)) el.removeAttribute("data-dg-id");
    }

    // Make image srcs absolute
    for (const img of clone.querySelectorAll("img[src]")) {
      const src = img.getAttribute("src");
      if (src && !src.startsWith("data:") && !src.startsWith("http")) {
        try { img.setAttribute("src", new URL(src, baseURI).href); } catch {}
      }
    }
    // Strip scripts
    clone.querySelectorAll("script").forEach(s => s.remove());

    // Page background
    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
    const htmlBg = window.getComputedStyle(document.documentElement).backgroundColor;
    const rawPageBg = (bodyBg && bodyBg !== "rgba(0, 0, 0, 0)") ? bodyBg
      : (htmlBg && htmlBg !== "rgba(0, 0, 0, 0)") ? htmlBg : "#ffffff";
    const pageBg = normalizeColor(rawPageBg);

    const rect = el.getBoundingClientRect();

    // Convert inline styles to Tailwind classes
    convertToTailwind(clone);

    // Generate structural outline
    const outline = generateOutline(clone);

    // Build output
    const cssBlocks = [];
    if (fontFaceRules.length) cssBlocks.push(fontFaceRules.join("\n"));
    if (pseudoCSS.length) cssBlocks.push(pseudoCSS.join("\n"));
    if (interactiveCSS.length) cssBlocks.push("/* Hover/Focus/Active states */\n" + interactiveCSS.join("\n"));

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Element Capture</title>
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"><\/script>
<style type="text/tailwindcss">
@theme { --color-page-bg: ${pageBg}; }
</style>
<style>
${cssBlocks.join("\n")}
</style>
</head>
<!--
STRUCTURE
─────────
${outline}
-->
<body class="bg-[var(--color-page-bg)] flex items-center justify-center min-h-screen p-10">
${clone.outerHTML}
</body>
</html>`;

    return {
      html,
      outline,
      tag: el.tagName.toLowerCase(),
      dimensions: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
      sizeKB: (html.length / 1024).toFixed(0),
    };
  }

  // ─── Inline style → Tailwind class converter ───

  function convertToTailwind(root) {
    const allEls = [root, ...root.querySelectorAll("*")];
    for (const el of allEls) {
      const style = el.getAttribute("style");
      if (!style) continue;

      const classes = [];
      const remaining = [];

      // Parse style string into property:value pairs
      const pairs = parseStyleString(style);

      for (const [prop, val] of pairs) {
        const tw = cssToTailwind(prop, val);
        if (tw === "") continue; // explicitly skip (default value, no class needed)
        if (tw) {
          classes.push(tw);
        } else {
          remaining.push(`${prop}:${val}`);
        }
      }

      // Post-process: collapse common patterns
      const classSet = new Set(classes);

      // Remove default display classes based on tag
      const tagName = el.tagName?.toLowerCase() || "";
      const BLOCK_TAGS = new Set(["div","section","article","aside","header","footer","main","nav","p","h1","h2","h3","h4","h5","h6","ul","ol","li","blockquote","pre","figure","figcaption","details","summary","form","fieldset","table","hr","address","dl","dt","dd"]);
      const INLINE_TAGS = new Set(["span","a","strong","em","b","i","u","s","small","sub","sup","mark","abbr","cite","code","kbd","var","samp","q","label","time","data","ruby","br","title"]);
      if (classSet.has("block") && BLOCK_TAGS.has(tagName)) classSet.delete("block");
      if (classSet.has("inline") && INLINE_TAGS.has(tagName)) classSet.delete("inline");

      // "relative top-0 right-0 bottom-0 left-0" with no actual offset → drop all 5
      if (classSet.has("relative") && classSet.has("top-0") && classSet.has("right-0") &&
          classSet.has("bottom-0") && classSet.has("left-0")) {
        // Check if any of the TRBL values are non-zero — if all zero, relative is a no-op
        classSet.delete("relative");
        classSet.delete("top-0");
        classSet.delete("right-0");
        classSet.delete("bottom-0");
        classSet.delete("left-0");
      }

      // "absolute top-0 right-0 bottom-0 left-0" → "absolute inset-0"
      if (classSet.has("absolute") && classSet.has("top-0") && classSet.has("right-0") &&
          classSet.has("bottom-0") && classSet.has("left-0")) {
        classSet.delete("top-0");
        classSet.delete("right-0");
        classSet.delete("bottom-0");
        classSet.delete("left-0");
        classSet.add("inset-0");
      }

      // "grow basis-0" → "flex-1"
      if (classSet.has("grow") && classSet.has("basis-0")) {
        classSet.delete("grow");
        classSet.delete("basis-0");
        classSet.add("flex-1");
      }

      // Set class and remaining style
      const finalClasses = [...classSet];
      if (finalClasses.length) {
        const existing = el.getAttribute("class") || "";
        el.setAttribute("class", (existing + " " + finalClasses.join(" ")).trim());
      }
      if (remaining.length) {
        el.setAttribute("style", remaining.join(";"));
      } else {
        el.removeAttribute("style");
      }
    }
  }

  function parseStyleString(str) {
    const pairs = [];
    // Split on ; but not inside parentheses
    const parts = str.split(/;(?![^(]*\))/);
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx === -1) continue;
      const prop = trimmed.substring(0, colonIdx).trim();
      const val = trimmed.substring(colonIdx + 1).trim();
      if (prop && val) pairs.push([prop, val]);
    }
    return pairs;
  }

  // Convert modern color formats (oklab, oklch, lch, lab) to rgba
  const _colorCanvas = document.createElement("canvas");
  _colorCanvas.width = 1; _colorCanvas.height = 1;
  const _colorCtx = _colorCanvas.getContext("2d");

  function normalizeColor(val) {
    if (!val) return val;
    // Only convert if it uses a modern color function
    if (!/^(oklab|oklch|lch|lab|color)\(/i.test(val)) return val;
    try {
      _colorCtx.clearRect(0, 0, 1, 1);
      _colorCtx.fillStyle = "#000";
      _colorCtx.fillStyle = val;
      _colorCtx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = _colorCtx.getImageData(0, 0, 1, 1).data;
      if (a === 0 && val.includes("/")) {
        // Canvas doesn't preserve alpha from oklab() — parse it manually
        const alphaMatch = val.match(/\/\s*([\d.]+)\s*\)/);
        if (alphaMatch) {
          const alpha = parseFloat(alphaMatch[1]);
          return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
      }
      return a < 255 ? `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(2)})` : `rgb(${r}, ${g}, ${b})`;
    } catch {
      return val;
    }
  }

  function cssToTailwind(prop, val) {
    // Normalize modern color formats for color-related properties
    const COLOR_PROPS = new Set([
      "color", "background-color", "border-top-color", "border-right-color",
      "border-bottom-color", "border-left-color", "fill", "stroke",
      "-webkit-text-fill-color", "outline-color",
    ]);
    if (COLOR_PROPS.has(prop)) val = normalizeColor(val);
    // Also normalize colors inside box-shadow values
    if (prop === "box-shadow" && /oklab|oklch|lch|lab|color\(/i.test(val)) {
      val = val.replace(/(oklab|oklch|lch|lab|color)\([^)]+\)/gi, m => normalizeColor(m));
    }

    // ─── Display ───
    if (prop === "display") {
      const map = { flex: "flex", grid: "grid", block: "block", inline: "inline",
        "inline-flex": "inline-flex", "inline-grid": "inline-grid",
        "inline-block": "inline-block", none: "hidden", contents: "contents",
        "flow-root": "flow-root" };
      return map[val] || null;
    }

    // ─── Position ───
    if (prop === "position") {
      return { relative: "relative", absolute: "absolute", fixed: "fixed",
        sticky: "sticky", static: "static" }[val] || null;
    }

    // ─── Top / Right / Bottom / Left ───
    if (prop === "top" || prop === "right" || prop === "bottom" || prop === "left") {
      if (val === "0px") return `${prop}-0`;
      if (val === "auto") return `${prop}-auto`;
      return `${prop}-[${val}]`;
    }

    // ─── Width / Height ───
    if (prop === "width") return sizeClass("w", val);
    if (prop === "height") return sizeClass("h", val);
    if (prop === "min-width") return sizeClass("min-w", val);
    if (prop === "max-width") return sizeClass("max-w", val);
    if (prop === "min-height") return sizeClass("min-h", val);
    if (prop === "max-height") return sizeClass("max-h", val);

    // ─── Margin ───
    if (prop === "margin") return boxClass("m", val);
    if (prop === "margin-top") return singleSpacing("mt", val);
    if (prop === "margin-right") return singleSpacing("mr", val);
    if (prop === "margin-bottom") return singleSpacing("mb", val);
    if (prop === "margin-left") return singleSpacing("ml", val);

    // ─── Padding ───
    if (prop === "padding") return boxClass("p", val);
    if (prop === "padding-top") return singleSpacing("pt", val);
    if (prop === "padding-right") return singleSpacing("pr", val);
    if (prop === "padding-bottom") return singleSpacing("pb", val);
    if (prop === "padding-left") return singleSpacing("pl", val);

    // ─── Flex ───
    if (prop === "flex-direction") return { row: "flex-row", column: "flex-col",
      "row-reverse": "flex-row-reverse", "column-reverse": "flex-col-reverse" }[val] || null;
    if (prop === "flex-wrap") return { wrap: "flex-wrap", nowrap: "flex-nowrap",
      "wrap-reverse": "flex-wrap-reverse" }[val] || null;
    if (prop === "flex-grow") return val === "1" ? "grow" : val === "0" ? "grow-0" : `grow-[${val}]`;
    if (prop === "flex-shrink") return val === "1" ? "shrink" : val === "0" ? "shrink-0" : `shrink-[${val}]`;
    if (prop === "flex-basis") {
      if (val === "auto") return "basis-auto";
      if (val === "0px" || val === "0%") return "basis-0";
      return `basis-[${val}]`;
    }
    if (prop === "justify-content") {
      return { "flex-start": "justify-start", "flex-end": "justify-end", center: "justify-center",
        "space-between": "justify-between", "space-around": "justify-around",
        "space-evenly": "justify-evenly" }[val] || null;
    }
    if (prop === "align-items") {
      return { "flex-start": "items-start", "flex-end": "items-end", center: "items-center",
        baseline: "items-baseline", stretch: "items-stretch" }[val] || null;
    }
    if (prop === "align-self") {
      return { auto: "self-auto", "flex-start": "self-start", "flex-end": "self-end",
        center: "self-center", stretch: "self-stretch", baseline: "self-baseline" }[val] || null;
    }
    if (prop === "align-content") {
      return { "flex-start": "content-start", "flex-end": "content-end",
        center: "content-center", "space-between": "content-between",
        "space-around": "content-around", stretch: "content-stretch" }[val] || null;
    }
    if (prop === "order") return val === "0" ? null : `order-[${val}]`;

    // ─── Gap ───
    if (prop === "gap") return `gap-[${val}]`;
    if (prop === "row-gap") return `gap-y-[${val}]`;
    if (prop === "column-gap") return `gap-x-[${val}]`;

    // ─── Grid ───
    if (prop === "grid-template-columns") return `grid-cols-[${val.replace(/\s+/g, "_")}]`;
    if (prop === "grid-template-rows") return `grid-rows-[${val.replace(/\s+/g, "_")}]`;
    if (prop === "grid-auto-flow") return { row: "grid-flow-row", column: "grid-flow-col",
      dense: "grid-flow-dense" }[val] || null;

    // ─── Typography ───
    if (prop === "color") return `text-[${val.replace(/\s/g, "_")}]`;
    if (prop === "font-family") return `font-[${val.split(",")[0].trim().replace(/['"]/g, "")}]`;
    if (prop === "font-size") return `text-[${val}]`;
    if (prop === "font-weight") {
      if (val === "400") return ""; // default, skip entirely
      const map = { "100": "font-thin", "200": "font-extralight", "300": "font-light",
        "500": "font-medium", "600": "font-semibold",
        "700": "font-bold", "800": "font-extrabold", "900": "font-black" };
      return map[val] || `font-[${val}]`;
    }
    if (prop === "font-style") return val === "italic" ? "italic" : val === "normal" ? "not-italic" : null;
    if (prop === "line-height") return `leading-[${val}]`;
    if (prop === "letter-spacing") return val === "normal" ? "" : `tracking-[${val}]`;
    if (prop === "text-align") return { left: "text-left", center: "text-center",
      right: "text-right", justify: "text-justify" }[val] || null;
    if (prop === "text-transform") return { uppercase: "uppercase", lowercase: "lowercase",
      capitalize: "capitalize", none: "normal-case" }[val] || null;
    if (prop === "text-overflow") return val === "ellipsis" ? "text-ellipsis" : val === "clip" ? "text-clip" : null;
    if (prop === "white-space") return { nowrap: "whitespace-nowrap", normal: "whitespace-normal",
      pre: "whitespace-pre", "pre-line": "whitespace-pre-line",
      "pre-wrap": "whitespace-pre-wrap" }[val] || null;
    if (prop === "word-break") return val === "break-all" ? "break-all" :
      val === "break-word" ? "break-words" : null;
    if (prop === "text-decoration-line") return { underline: "underline",
      "line-through": "line-through", overline: "overline" }[val] || null;
    if (prop === "text-indent") return `indent-[${val}]`;
    if (prop === "text-shadow") return `[text-shadow:${val.replace(/\s/g, "_")}]`;

    // ─── Background ───
    if (prop === "background-color") return `bg-[${val.replace(/\s/g, "_")}]`;
    if (prop === "background-image") return `bg-[${val.replace(/\s/g, "_")}]`;
    if (prop === "background-size") return val === "cover" ? "bg-cover" :
      val === "contain" ? "bg-contain" : `bg-[size:${val}]`;
    if (prop === "background-position") return `bg-[position:${val.replace(/\s/g, "_")}]`;
    if (prop === "background-repeat") return { "no-repeat": "bg-no-repeat",
      repeat: "bg-repeat", "repeat-x": "bg-repeat-x", "repeat-y": "bg-repeat-y" }[val] || null;
    if (prop === "background-clip") return val === "text" ? "bg-clip-text" : null;
    if (prop === "-webkit-background-clip") return val === "text" ? "bg-clip-text" : null;

    // ─── Border ───
    if (prop === "border") return `border-[${val.replace(/\s/g, "_")}]`;
    if (prop === "border-top-width" || prop === "border-right-width" ||
        prop === "border-bottom-width" || prop === "border-left-width") {
      const side = prop.replace("border-", "").replace("-width", "");
      const s = { top: "t", right: "r", bottom: "b", left: "l" }[side];
      return val === "1px" ? `border-${s}` : `border-${s}-[${val}]`;
    }
    if (prop === "border-top-style" || prop === "border-right-style" ||
        prop === "border-bottom-style" || prop === "border-left-style") {
      return `border-${val}`;
    }
    if (prop === "border-top-color" || prop === "border-right-color" ||
        prop === "border-bottom-color" || prop === "border-left-color") {
      const side = prop.replace("border-", "").replace("-color", "");
      const s = { top: "t", right: "r", bottom: "b", left: "l" }[side];
      return `border-${s}-[${val.replace(/\s/g, "_")}]`;
    }
    if (prop === "border-radius") return borderRadiusClass(val);
    if (prop === "border-top-left-radius") return `rounded-tl-[${val}]`;
    if (prop === "border-top-right-radius") return `rounded-tr-[${val}]`;
    if (prop === "border-bottom-left-radius") return `rounded-bl-[${val}]`;
    if (prop === "border-bottom-right-radius") return `rounded-br-[${val}]`;

    // ─── Effects ───
    if (prop === "box-shadow") return `shadow-[${val.replace(/\s/g, "_")}]`;
    if (prop === "opacity") return `opacity-[${val}]`;
    if (prop === "filter") return `[filter:${val.replace(/\s/g, "_")}]`;
    if (prop === "backdrop-filter") return `[backdrop-filter:${val.replace(/\s/g, "_")}]`;
    if (prop === "mix-blend-mode") return `mix-blend-${val}`;
    if (prop === "transform") return val === "none" ? null : `[transform:${val.replace(/\s/g, "_")}]`;

    // ─── Overflow ───
    if (prop === "overflow") return { hidden: "overflow-hidden", auto: "overflow-auto",
      scroll: "overflow-scroll", visible: "overflow-visible", clip: "overflow-clip" }[val] || null;
    if (prop === "overflow-x") return { hidden: "overflow-x-hidden", auto: "overflow-x-auto",
      scroll: "overflow-x-scroll" }[val] || null;
    if (prop === "overflow-y") return { hidden: "overflow-y-hidden", auto: "overflow-y-auto",
      scroll: "overflow-y-scroll" }[val] || null;

    // ─── Misc ───
    if (prop === "cursor") return { pointer: "cursor-pointer", default: "cursor-default",
      "not-allowed": "cursor-not-allowed", grab: "cursor-grab", text: "cursor-text" }[val] || `cursor-[${val}]`;
    if (prop === "pointer-events") return val === "none" ? "pointer-events-none" :
      val === "auto" ? "pointer-events-auto" : null;
    if (prop === "user-select") return val === "none" ? "select-none" :
      val === "all" ? "select-all" : val === "text" ? "select-text" : null;
    if (prop === "vertical-align") return `align-${val}`;
    if (prop === "z-index") return `z-[${val}]`;
    if (prop === "visibility") return val === "hidden" ? "invisible" : val === "visible" ? "visible" : null;
    if (prop === "float") return val === "none" ? null : `float-${val}`;
    if (prop === "clear") return val === "none" ? null : `clear-${val}`;
    if (prop === "list-style-type") return `list-${val}`;
    if (prop === "object-fit") return `object-${val}`;
    if (prop === "object-position") return `object-[${val.replace(/\s/g, "_")}]`;
    if (prop === "aspect-ratio") return val === "auto" ? null : `aspect-[${val.replace(/\s/g, "_")}]`;
    if (prop === "color-scheme") return ""; // skip, handled by html class or not needed

    // ─── SVG ───
    if (prop === "fill") return val === "none" ? "fill-none" : `fill-[${val.replace(/\s/g, "_")}]`;
    if (prop === "stroke") return val === "none" ? "stroke-none" : `stroke-[${val.replace(/\s/g, "_")}]`;
    if (prop === "stroke-width") return `stroke-[${val}]`;
    if (prop === "stroke-linecap") return `[stroke-linecap:${val}]`;
    if (prop === "stroke-linejoin") return `[stroke-linejoin:${val}]`;
    if (prop === "clip-path") return `[clip-path:${val.replace(/\s/g, "_")}]`;

    // ─── Webkit ───
    if (prop === "-webkit-font-smoothing") return val === "antialiased" ? "antialiased" : null;
    if (prop === "-webkit-text-fill-color") return `[-webkit-text-fill-color:${val.replace(/\s/g, "_")}]`;

    // ─── CSS custom properties — keep as inline style ───
    if (prop.startsWith("--")) return null;

    // Fallback: arbitrary property
    return `[${prop}:${val.replace(/\s/g, "_")}]`;
  }

  function sizeClass(prefix, val) {
    if (val === "auto") return `${prefix}-auto`;
    if (val === "100%") return `${prefix}-full`;
    if (val === "100vh" || val === "100dvh") return `${prefix}-screen`;
    if (val === "0px") return `${prefix}-0`;
    if (val === "fit-content") return `${prefix}-fit`;
    if (val === "min-content") return `${prefix}-min`;
    if (val === "max-content") return `${prefix}-max`;
    return `${prefix}-[${val}]`;
  }

  function singleSpacing(prefix, val) {
    if (val === "0px") return `${prefix}-0`;
    if (val === "auto") return `${prefix}-auto`;
    if (val.startsWith("-")) return `-${prefix}-[${val.substring(1)}]`;
    return `${prefix}-[${val}]`;
  }

  function boxClass(prefix, val) {
    const parts = val.split(/\s+/);
    if (parts.length === 1) return `${prefix}-[${parts[0]}]`;
    // Expand to individual classes: T R B L
    const sides = { p: ["pt", "pr", "pb", "pl"], m: ["mt", "mr", "mb", "ml"] }[prefix];
    if (!sides) return null;
    let t, r, b, l;
    if (parts.length === 2) { t = b = parts[0]; r = l = parts[1]; }
    else if (parts.length === 3) { t = parts[0]; r = l = parts[1]; b = parts[2]; }
    else { t = parts[0]; r = parts[1]; b = parts[2]; l = parts[3]; }
    const classes = [];
    if (t !== "0px") classes.push(singleSpacing(sides[0], t));
    if (r !== "0px") classes.push(singleSpacing(sides[1], r));
    if (b !== "0px") classes.push(singleSpacing(sides[2], b));
    if (l !== "0px") classes.push(singleSpacing(sides[3], l));
    return classes.join(" ") || "";
  }

  function borderRadiusClass(val) {
    if (val === "0px") return "rounded-none";
    if (val === "9999px") return "rounded-full";
    const parts = val.split(/\s+/);
    if (parts.length === 1) return `rounded-[${val}]`;
    return `rounded-[${val.replace(/\s/g, "_")}]`;
  }

  // ─── Structural outline generator ───

  function generateOutline(root) {
    const lines = [];
    walk(root, 0, lines);
    return lines.join("\n");
  }

  function walk(el, depth, lines) {
    if (!el || el.nodeType !== 1) return;
    const tag = el.tagName.toLowerCase();

    // Skip SVG internals — just show the <svg> itself
    if (tag !== "svg" && el.closest && el.ownerSVGElement) return;

    const indent = "    ".repeat(depth);
    const label = describeElement(el);

    // Check if this is a leaf (no element children, or only SVG/text)
    const children = [...el.children].filter(c => {
      const t = c.tagName.toLowerCase();
      // Skip SVG internals
      if (c.ownerSVGElement) return false;
      return true;
    });

    const selector = getUniqueSelector(el);
    const selectorPart = ` [${selector}]`;

    if (children.length === 0) {
      // Leaf node — show on one line
      const text = getTextPreview(el);
      const textPart = text ? ` "${text}"` : "";
      lines.push(`${indent}<${tag}>${label}${selectorPart}${textPart}`);
    } else {
      // Container — show open/close with children
      lines.push(`${indent}<${tag}>${label}${selectorPart}`);
      for (const child of children) {
        walk(child, depth + 1, lines);
      }
    }
  }

  function getUniqueSelector(el) {
    const parts = [];
    let current = el;
    while (current && current.nodeType === 1) {
      const tag = current.tagName.toLowerCase();

      // If element has a meaningful id, use it and stop
      if (current.id && !/^(base-ui|radix)/.test(current.id)) {
        parts.unshift(`#${current.id}`);
        break;
      }

      // If element has data-slot, use it
      const slot = current.getAttribute("data-slot");
      if (slot) {
        parts.unshift(`[data-slot="${slot}"]`);
        break;
      }

      // If element has aria-label, use it
      const ariaLabel = current.getAttribute("aria-label");
      if (ariaLabel) {
        parts.unshift(`${tag}[aria-label="${ariaLabel}"]`);
        break;
      }

      // Use tag + nth-child for position
      const parent = current.parentElement;
      if (!parent) {
        parts.unshift(tag);
        break;
      }

      const siblings = [...parent.children].filter(c => c.tagName === current.tagName);
      if (siblings.length === 1) {
        parts.unshift(tag);
      } else {
        const idx = siblings.indexOf(current) + 1;
        parts.unshift(`${tag}:nth-child(${[...parent.children].indexOf(current) + 1})`);
      }

      current = parent;
      // Stop at body or after 4 levels (keep selectors readable)
      if (tag === "body" || parts.length >= 4) break;
    }
    return parts.join(" > ");
  }

  function describeElement(el) {
    const parts = [];
    const tag = el.tagName.toLowerCase();
    const classes = el.getAttribute("class") || "";

    // Infer role/purpose from attributes, content, and styles
    const role = el.getAttribute("role");
    const ariaLabel = el.getAttribute("aria-label");
    const dataSlot = el.getAttribute("data-slot");
    const type = el.getAttribute("type");
    const href = el.getAttribute("href");
    const id = el.id;

    // Get display/layout from classes
    const isFlex = classes.includes("flex ") || classes.includes("flex-");
    const isGrid = classes.includes("grid ");
    const layout = isGrid ? "grid" : isFlex ? "flex" : null;

    // Determine direction
    const isCol = classes.includes("flex-col");
    const direction = isCol ? "column" : null;

    // Background?
    const hasBg = classes.includes("bg-[") || classes.includes("bg-");
    // Border/rounded?
    const hasRounded = classes.includes("rounded-");
    const hasBorder = classes.includes("border-") || classes.includes("border ");
    const hasShadow = classes.includes("shadow-[");

    // Try to infer a semantic description
    let desc = "";

    // From explicit attributes
    if (dataSlot) {
      desc = dataSlot.replace(/-/g, " ");
    } else if (ariaLabel) {
      desc = ariaLabel;
    } else if (role && role !== "button" && role !== "presentation") {
      desc = role;
    } else if (tag === "nav") {
      desc = "navigation";
    } else if (tag === "button") {
      const text = getTextPreview(el);
      desc = text ? `button: ${text}` : "button";
    } else if (tag === "a" && href) {
      const text = getTextPreview(el);
      desc = text ? `link: ${text}` : `link → ${href}`;
    } else if (tag === "input") {
      desc = `input[${type || "text"}]`;
    } else if (tag === "img") {
      desc = `image`;
    } else if (tag === "svg") {
      desc = "icon";
    } else if (tag === "ul" || tag === "ol") {
      const count = el.children.length;
      desc = `list (${count} items)`;
    } else if (tag === "li") {
      desc = "list item";
    } else if (tag === "h1" || tag === "h2" || tag === "h3" || tag === "h4") {
      desc = "heading";
    } else if (tag === "p") {
      desc = "paragraph";
    } else if (tag === "section") {
      const sectionId = el.id;
      desc = sectionId ? `section#${sectionId}` : "section";
    } else if (tag === "form") {
      desc = "form";
    } else {
      // Infer from structure
      if (hasBg && hasRounded && (hasBorder || hasShadow)) {
        desc = "card";
      } else if (layout) {
        // Try to guess purpose from children count and layout
        const childCount = el.children.length;
        if (isCol && childCount > 3) {
          desc = "stack";
        } else if (!isCol && childCount === 2) {
          // Could be a row with label + action
          desc = "row";
        } else if (!isCol && childCount > 2) {
          desc = "toolbar";
        } else if (isCol) {
          desc = "group";
        } else {
          desc = "container";
        }
      }
    }

    // Build the annotation
    if (desc) parts.push(desc);

    // Add layout info if container
    if (layout && !["button", "a", "input"].includes(tag)) {
      const layoutDesc = direction ? `${layout}-${direction}` : layout;
      if (!desc.includes(layout)) parts.push(layoutDesc);
    }

    // Add gap if present
    const gapMatch = classes.match(/gap-\[(\d+)/);
    if (gapMatch) parts.push(`gap:${gapMatch[1]}px`);

    return parts.length ? " -- " + parts.join(", ") : "";
  }

  function getTextPreview(el) {
    // Get direct text content (not from children)
    let text = "";
    for (const node of el.childNodes) {
      if (node.nodeType === 3) {
        const t = node.textContent.trim();
        if (t) text += t + " ";
      }
    }
    text = text.trim();
    if (text.length > 40) text = text.substring(0, 37) + "...";
    return text;
  }

  function getPseudoStyle(cs) {
    const parts = [];
    if (cs.content && cs.content !== "none" && cs.content !== "normal") {
      parts.push(`content:${cs.content}`);
    }
    // Only capture visually meaningful properties for pseudo-elements
    const props = [
      "display", "position", "top", "right", "bottom", "left",
      "width", "height", "color", "background-color", "background-image",
      "font-family", "font-size", "font-weight", "line-height",
      "text-align", "vertical-align",
      "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
      "border-top-style", "border-right-style", "border-bottom-style", "border-left-style",
      "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
      "border-radius", "margin-top", "margin-right", "margin-bottom", "margin-left",
      "padding-top", "padding-right", "padding-bottom", "padding-left",
      "opacity", "transform", "pointer-events", "user-select",
      "-webkit-font-smoothing",
    ];
    for (const prop of props) {
      const v = cs.getPropertyValue(prop);
      if (!v || isDefaultValue(prop, v)) continue;
      parts.push(`${prop}:${v}`);
    }
    return parts.join(";");
  }
})();
