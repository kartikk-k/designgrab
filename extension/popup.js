// ─── Elements ───────────────────────────────────

const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const capturePageBtn = document.getElementById("capturePage");
const captureElementBtn = document.getElementById("captureElement");
const resultDiv = document.getElementById("result");
const serverUrlInput = document.getElementById("serverUrl");

const log = (...args) => console.log("[DG Popup]", ...args);

chrome.storage?.local?.get("serverUrl", (data) => {
  if (data.serverUrl) serverUrlInput.value = data.serverUrl;
});

serverUrlInput.addEventListener("change", () => {
  chrome.storage?.local?.set({ serverUrl: serverUrlInput.value });
  checkServer();
});

// ─── Server check ───────────────────────────────

async function checkServer() {
  const url = `${serverUrlInput.value}/health`;
  log("Checking server at", url);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
    const data = await res.json();
    log("Server response:", data);
    if (data.status === "ok") {
      statusDot.classList.add("connected");
      statusText.textContent = "Server connected";
      capturePageBtn.disabled = false;
      captureElementBtn.disabled = false;
      return true;
    }
  } catch (e) {
    log("Server check failed:", e.message);
  }
  statusDot.classList.remove("connected");
  statusText.textContent = "Server offline — run: npx designgrab";
  capturePageBtn.disabled = true;
  captureElementBtn.disabled = true;
  return false;
}

checkServer();

// ─── Capture ────────────────────────────────────

capturePageBtn.addEventListener("click", async () => {
  const connected = await checkServer();
  if (!connected) return;

  capturePageBtn.disabled = true;
  statusText.textContent = "Capturing page...";
  resultDiv.className = "result";
  resultDiv.style.display = "none";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab");
    log("Tab:", tab.id, tab.url);

    const serverUrl = serverUrlInput.value;
    const tabUrl = tab.url;
    const tabTitle = tab.title;

    // Run the capture script directly in the page
    // This inlines all CSS, strips scripts, and returns the clean HTML
    statusText.textContent = "Inlining stylesheets...";

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async () => {
        const baseURI = document.baseURI;

        // --- helpers ---
        async function fetchText(url) {
          try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return await res.text();
          } catch (e) {
            console.warn('[DG] Skipped (CORS):', url, e.message);
            return null;
          }
        }

        function absolutizeCssUrls(css, cssHref) {
          return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, ref) => {
            if (/^(data:|https?:|#)/i.test(ref)) return m;
            try { return 'url("' + new URL(ref, cssHref).href + '")'; }
            catch { return m; }
          });
        }

        // --- Step 1: Capture ALL CSS from the LIVE page before cloning ---
        // This is critical for CSS-in-JS apps (Linear, etc.) where styles
        // are injected at runtime by JavaScript.
        console.log('[DG] Capturing all CSS from live page...');
        const capturedCSS = [];

        // Method 1: Dump all rules from document.styleSheets
        for (const sheet of document.styleSheets) {
          try {
            let cssText = '';
            for (const rule of sheet.cssRules) {
              cssText += rule.cssText + '\n';
            }
            if (cssText) {
              capturedCSS.push(cssText);
            }
          } catch (e) {
            // Cross-origin stylesheet — try fetching
            if (sheet.href) {
              const css = await fetchText(sheet.href);
              if (css) {
                capturedCSS.push(absolutizeCssUrls(css, sheet.href));
              }
            }
          }
        }

        // Method 2: Also grab any <style> tag content directly from the live DOM
        // (catches styles that might not be in document.styleSheets)
        for (const style of document.querySelectorAll('style')) {
          if (style.textContent && style.textContent.trim()) {
            // Check if this content is already captured via styleSheets
            const text = style.textContent.trim();
            const alreadyCaptured = capturedCSS.some(css => css.includes(text.substring(0, 100)));
            if (!alreadyCaptured) {
              capturedCSS.push(text);
            }
          }
        }

        console.log('[DG] Captured', capturedCSS.length, 'CSS blocks');

        // --- Step 1b: Fix dark-theme rendering issues on LIVE DOM before cloning ---
        console.log('[DG] Step 1b: Fixing dark theme rendering...');
        const dgLog = { emptyVarsFound: 0, emptyVarsResolved: 0, elementsWithVars: 0, boxShadowSamples: [], overrideCount: 0 };
        try {
          // FIRST: Fix bright borders/box-shadows BEFORE any other modifications
          // (must run first so getComputedStyle returns the unmodified values)
          const htmlClasses = document.documentElement.className || '';
          const _pageIsDark = htmlClasses.includes('dark') ||
            document.documentElement.style.colorScheme === 'dark' ||
            (() => {
              const bg = window.getComputedStyle(document.body).backgroundColor;
              const m = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
              if (m) return parseInt(m[1]) < 80;
              return false;
            })();

          if (_pageIsDark) {
            const _canvas = document.createElement('canvas');
            _canvas.width = 1; _canvas.height = 1;
            const _ctx = _canvas.getContext('2d');

            function _isBright(c) {
              if (!c || c === 'transparent' || c === 'rgba(0, 0, 0, 0)') return false;
              if (c === 'currentcolor' || c === 'currentColor') return true;
              try {
                _ctx.clearRect(0, 0, 1, 1);
                _ctx.fillStyle = '#000';
                _ctx.fillStyle = c;
                _ctx.fillRect(0, 0, 1, 1);
                const [r, g, b] = _ctx.getImageData(0, 0, 1, 1).data;
                return r > 200 && g > 200 && b > 200;
              } catch { return false; }
            }

            const _rootStyle = window.getComputedStyle(document.documentElement);
            const _themeBorder = _rootStyle.getPropertyValue('--bg-border-color').trim() || 'rgba(255,255,255,0.08)';

            let _borderFixes = 0;
            let _shadowFixes = 0;
            for (const el of document.querySelectorAll('*')) {
              const cs = window.getComputedStyle(el);

              // Fix bright borders
              const bw = [parseFloat(cs.borderTopWidth)||0, parseFloat(cs.borderRightWidth)||0,
                          parseFloat(cs.borderBottomWidth)||0, parseFloat(cs.borderLeftWidth)||0];
              const bc = [cs.borderTopColor, cs.borderRightColor, cs.borderBottomColor, cs.borderLeftColor];
              let needsBorderFix = false;
              for (let i = 0; i < 4; i++) {
                if (bw[i] > 0 && _isBright(bc[i])) { needsBorderFix = true; break; }
              }
              if (needsBorderFix) {
                const s = el.getAttribute('style') || '';
                el.setAttribute('style', s +
                  ';border-top-color:' + _themeBorder + '!important' +
                  ';border-right-color:' + _themeBorder + '!important' +
                  ';border-bottom-color:' + _themeBorder + '!important' +
                  ';border-left-color:' + _themeBorder + '!important');
                _borderFixes++;
              }

              // Fix bright box-shadows
              const bs = cs.boxShadow;
              if (bs && bs !== 'none') {
                // Extract colors from the box-shadow value
                let hasBrightShadow = false;
                const shadowColors = bs.match(/rgba?\([^)]+\)|lch\([^)]+\)|oklch\([^)]+\)|#[0-9a-f]{3,8}/gi) || [];
                for (const sc of shadowColors) {
                  if (_isBright(sc)) { hasBrightShadow = true; break; }
                }
                if (hasBrightShadow) {
                  const s = el.getAttribute('style') || '';
                  el.setAttribute('style', s + ';box-shadow:none!important');
                  _shadowFixes++;
                }
              }
            }
            console.log('[DG] Fixed', _borderFixes, 'bright borders,', _shadowFixes, 'bright shadows');
          }

          // NOW resolve empty CSS variables
          const elemsWithVars = document.querySelectorAll('[style*="--"]');
          dgLog.elementsWithVars = elemsWithVars.length;
          console.log('[DG] Found', elemsWithVars.length, 'elements with inline CSS vars');

          for (const el of elemsWithVars) {
            const style = el.getAttribute('style') || '';
            const emptyVars = style.match(/--[a-zA-Z0-9_-]+:\s*;/g);
            if (!emptyVars) continue;
            dgLog.emptyVarsFound += emptyVars.length;

            const computed = window.getComputedStyle(el);
            let updatedStyle = style;
            for (const emptyVar of emptyVars) {
              const varName = emptyVar.match(/^(--[a-zA-Z0-9_-]+)/)[1];
              const computedVal = computed.getPropertyValue(varName).trim();
              if (computedVal) {
                updatedStyle = updatedStyle.replace(emptyVar, varName + ': ' + computedVal + ';');
                dgLog.emptyVarsResolved++;
              }
            }
            if (updatedStyle !== style) {
              el.setAttribute('style', updatedStyle);
            }
          }
          console.log('[DG] Empty vars found:', dgLog.emptyVarsFound, 'resolved:', dgLog.emptyVarsResolved);

          // Now check: what does the box-shadow look like on elements with the white ring?
          // Sample a few elements that have box-shadow with CSS vars
          for (const el of elemsWithVars) {
            const style = el.getAttribute('style') || '';
            if (!style.includes('box-shadow') && !style.includes('--sx-cx2ark') && !style.includes('--focus-ring')) continue;
            const computed = window.getComputedStyle(el);
            const bs = computed.boxShadow;
            const tag = el.tagName;
            const cls = (el.className || '').toString().substring(0, 50);
            dgLog.boxShadowSamples.push({ tag, cls, style: style.substring(0, 100), computedBoxShadow: bs });
          }
          if (dgLog.boxShadowSamples.length) {
            console.log('[DG] Box-shadow samples:');
            dgLog.boxShadowSamples.slice(0, 5).forEach(s => {
              console.log('[DG]   ', s.tag, s.cls.substring(0, 30), '| computed box-shadow:', s.computedBoxShadow);
            });
          }

          // Inline computed styles on ALL elements with CSS vars
          let resolvedCount = 0;
          for (const el of elemsWithVars) {
            const computed = window.getComputedStyle(el);
            const overrides = [];

            const bg = computed.backgroundColor;
            const borderRadius = computed.borderRadius;
            const boxShadow = computed.boxShadow;
            const border = computed.border;
            const borderColor = computed.borderColor;
            const borderWidth = computed.borderWidth;

            if (bg && bg !== 'rgba(0, 0, 0, 0)') overrides.push('background-color:' + bg + ' !important');
            if (borderRadius && borderRadius !== '0px') overrides.push('border-radius:' + borderRadius + ' !important');
            if (boxShadow && boxShadow !== 'none') overrides.push('box-shadow:' + boxShadow + ' !important');
            if (border) overrides.push('border:' + border + ' !important');
            // Inline computed color (catches unresolved color vars on icons/text)
            const color = computed.color;
            if (color) overrides.push('color:' + color + ' !important');
            overrides.push('outline:none !important');

            if (overrides.length) {
              const existing = el.getAttribute('style') || '';
              el.setAttribute('style', existing + ';' + overrides.join(';'));
              resolvedCount++;
            }
          }
          dgLog.overrideCount = resolvedCount;
          console.log('[DG] Inlined computed styles on', resolvedCount, 'elements');

          // Fix separators — inline computed border on [role="separator"]
          for (const el of document.querySelectorAll('[role="separator"]')) {
            const computed = window.getComputedStyle(el);
            const borderTop = computed.borderTop;
            const borderBottom = computed.borderBottom;
            const bg = computed.backgroundColor;
            const overrides = [];
            if (borderTop) overrides.push('border-top:' + borderTop + ' !important');
            if (borderBottom) overrides.push('border-bottom:' + borderBottom + ' !important');
            if (bg && bg !== 'rgba(0, 0, 0, 0)') overrides.push('background-color:' + bg + ' !important');
            overrides.push('border-left:none !important;border-right:none !important');
            const existing = el.getAttribute('style') || '';
            el.setAttribute('style', existing + ';' + overrides.join(';'));
          }

          // (border and shadow fixes are at the top of Step 1b)

          console.log('[DG] Step 1b complete:', dgLog.overrideCount, 'var overrides');
        } catch (e) {
          console.warn('[DG] Error resolving CSS variables:', e.message);
        }

        // --- Step 2: Clone the DOM (now with resolved inline styles) ---
        console.log('[DG] Cloning DOM...');
        const doc = document.documentElement.cloneNode(true);
        doc.querySelectorAll('base').forEach(b => b.remove());

        // --- Step 3: Inline external stylesheets in the clone ---
        for (const link of [...doc.querySelectorAll('link[rel~="stylesheet"][href]')]) {
          const href = new URL(link.getAttribute('href'), baseURI).href;
          const css = await fetchText(href);
          if (css !== null) {
            const style = document.createElement('style');
            style.textContent = absolutizeCssUrls(css, href);
            link.replaceWith(style);
          }
        }

        // --- Step 4: Remove ALL existing <style> tags from clone and replace
        // with the captured CSS (ensures we have the complete computed styles) ---
        const head = doc.querySelector('head');
        // Remove existing styles from clone
        doc.querySelectorAll('style').forEach(s => s.remove());
        // Inject all captured CSS
        for (const css of capturedCSS) {
          const style = document.createElement('style');
          style.setAttribute('data-dg-captured', 'true');
          style.textContent = css;
          if (head) head.appendChild(style);
        }

        // --- Step 5: STRIP all scripts ---
        console.log('[DG] Stripping scripts...');
        doc.querySelectorAll('script').forEach(s => s.remove());

        // Remove link[rel=modulepreload] (JS modules, not CSS)
        doc.querySelectorAll('link[rel="modulepreload"]').forEach(l => l.remove());

        // --- Step 4b: Inject global CSS fix for static capture ---
        // Without JS running, focus states, outlines, and some transitions
        // render incorrectly. This reset handles the general case for all sites.
        const captureFix = document.createElement('style');
        captureFix.setAttribute('data-dg-fix', 'true');
        captureFix.textContent = `
          /* Remove all focus outlines — in a static capture nothing is focused */
          *:focus, *:focus-visible, *:focus-within {
            outline: none !important;
            outline-width: 0 !important;
          }
          /* Remove default outlines on interactive elements */
          [tabindex], [role], button, a, input, select, textarea, summary {
            outline: none !important;
          }
          /* Disable transitions/animations — static snapshot */
          *, *::before, *::after {
            transition: none !important;
            animation: none !important;
          }
        `;
        const cloneHead = doc.querySelector('head');
        if (cloneHead) cloneHead.appendChild(captureFix);

        // 3. Strip noscript, iframes, browser extension artifacts
        doc.querySelectorAll('noscript, iframe, plasmo-csui').forEach(el => el.remove());

        // 4. Make links/image srcs absolute
        for (const el of [...doc.querySelectorAll('a[href]')]) {
          const href = el.getAttribute('href');
          if (href && !/^(data:|https?:|mailto:|tel:|#|javascript:)/i.test(href)) {
            try { el.setAttribute('href', new URL(href, baseURI).href); } catch {}
          }
        }
        for (const img of [...doc.querySelectorAll('img[src]')]) {
          const src = img.getAttribute('src');
          if (src && !src.startsWith('data:') && !src.startsWith('http')) {
            try { img.setAttribute('src', new URL(src, baseURI).href); } catch {}
          }
        }
        // Strip srcset (broken relative refs)
        doc.querySelectorAll('img[srcset], source[srcset]').forEach(el => el.removeAttribute('srcset'));

        // 5. Remove meta tags that aren't needed
        doc.querySelectorAll('meta[http-equiv], meta[name="robots"], meta[name="googlebot"]').forEach(m => m.remove());

        // Assemble
        const html = '<!DOCTYPE html>\n' + doc.outerHTML;
        console.log('[DG] Capture complete:', (html.length / 1024).toFixed(0) + 'KB');
        return html;
      },
      world: "MAIN",
    });

    const capturedHtml = results[0]?.result;
    if (!capturedHtml) throw new Error("Capture returned empty");

    log("Captured HTML:", (capturedHtml.length / 1024).toFixed(0) + "KB");
    statusText.textContent = "Sending to server...";

    // Send to server
    const res = await fetch(`${serverUrl}/capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: tabUrl,
        data: capturedHtml,
        title: tabTitle,
        timestamp: Date.now(),
        captureType: "power", // New capture type
      }),
    });

    const result = await res.json();
    log("Server response:", result);
    if (result.error) throw new Error(result.error);

    statusText.textContent = "Captured!";
    resultDiv.className = "result show success";
    resultDiv.textContent = "";
    const strong = document.createElement("strong");
    strong.textContent = result.site;
    resultDiv.appendChild(strong);
    resultDiv.appendChild(document.createElement("br"));
    resultDiv.appendChild(document.createTextNode(`Saved: ${result.filename} (${result.sizeKB}KB)`));
    capturePageBtn.disabled = false;
    capturePageBtn.textContent = "Capture Again";
  } catch (err) {
    log("Capture error:", err.message, err.stack);
    statusText.textContent = "Error";
    resultDiv.className = "result show error";
    resultDiv.textContent = err.message;
    capturePageBtn.disabled = false;
  }
});

// ─── Element Capture ───────────────────────────────

captureElementBtn.addEventListener("click", async () => {
  const connected = await checkServer();
  if (!connected) return;

  captureElementBtn.disabled = true;
  capturePageBtn.disabled = true;
  resultDiv.className = "result";
  resultDiv.style.display = "none";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active tab");
    log("Element capture on tab:", tab.id, tab.url);

    const serverUrl = serverUrlInput.value;
    const tabUrl = tab.url;
    const tabTitle = tab.title;

    // Inject the element picker script
    statusText.textContent = "Pick an element...";
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["element-capture.js"],
      world: "MAIN",
    });

    // Close the popup — user needs to interact with the page
    // Poll for result from a background context
    // Since we can't keep the popup open while user clicks,
    // we'll poll from the popup before it closes.
    // Actually, let's use a different approach: inject and poll.

    // We need to keep checking for the result
    statusText.textContent = "Click an element on the page (Esc to cancel)";

    const pollForResult = async () => {
      const maxAttempts = 600; // 60 seconds
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 100));
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              const r = window.__DG_ELEMENT_RESULT__;
              if (r) {
                window.__DG_ELEMENT_RESULT__ = null;
                return r;
              }
              return null;
            },
            world: "MAIN",
          });
          const result = results[0]?.result;
          if (result) return result;
        } catch {
          // Tab may have been closed
          return { error: "Tab closed or unavailable" };
        }
      }
      return { error: "Timeout — no element selected" };
    };

    const elementResult = await pollForResult();

    if (elementResult.cancelled) {
      statusText.textContent = "Cancelled";
      captureElementBtn.disabled = false;
      capturePageBtn.disabled = false;
      return;
    }

    if (elementResult.error) {
      throw new Error(elementResult.error);
    }

    log("Element captured:", elementResult.tag, elementResult.dimensions, elementResult.sizeKB + "KB");
    statusText.textContent = "Sending to server...";

    // Send to server
    const res = await fetch(`${serverUrl}/capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: tabUrl,
        data: elementResult.html,
        title: tabTitle,
        timestamp: Date.now(),
        captureType: "element",
        elementTag: elementResult.tag,
        elementDimensions: elementResult.dimensions,
      }),
    });

    const result = await res.json();
    log("Server response:", result);
    if (result.error) throw new Error(result.error);

    statusText.textContent = "Element captured!";
    resultDiv.className = "result show success";
    resultDiv.textContent = "";
    const strong = document.createElement("strong");
    strong.textContent = result.site;
    resultDiv.appendChild(strong);
    resultDiv.appendChild(document.createElement("br"));
    resultDiv.appendChild(
      document.createTextNode(
        `Saved: ${result.filename} (${result.sizeKB}KB) — <${elementResult.tag}> ${elementResult.dimensions}`
      )
    );
    captureElementBtn.disabled = false;
    capturePageBtn.disabled = false;
  } catch (err) {
    log("Element capture error:", err.message, err.stack);
    statusText.textContent = "Error";
    resultDiv.className = "result show error";
    resultDiv.textContent = err.message;
    captureElementBtn.disabled = false;
    capturePageBtn.disabled = false;
  }
});
