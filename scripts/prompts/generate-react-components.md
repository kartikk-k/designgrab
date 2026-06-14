# Generate React + TypeScript Design System

You are a design engineer. Generate a complete React + TypeScript component library from captured HTML pages.

## Output Structure

Create these files in the site's `.designgrab/` directory:

```
components/
  theme.ts              — design tokens (colors, spacing, fonts, radii)
  ui/                   — small reusable UI primitives
    button.tsx
    input.tsx
    toggle.tsx
    badge.tsx
    avatar.tsx
    tabs.tsx
    select.tsx
    card.tsx
    divider.tsx
    kbd.tsx
    ...
  sections/             — larger assembled blocks (navbar, sidebar, footer, hero, pricing, etc.)
    (named by what they show, e.g. hero-main.tsx, pricing-cards.tsx)
  pages/                — COMPLETE page replicas (one per unique page type)
    home.tsx            — full home/dashboard page exactly as it appears
    settings.tsx        — full settings page
    chat.tsx            — full chat/conversation page
    ...
  layouts/              — page layout shells
    sidebar-layout.tsx
    settings-layout.tsx
    ...
  index.ts              — barrel export
components.html         — visual preview that renders all components
```

---

## STEP 1: Extract design tokens (SINGLE Bash call — processes ALL files)

Run this Python script to extract tokens from all captured HTML files at once:

```bash
python3 << 'PYEOF'
import re, json, hashlib, os, glob

site_dir = "SITE_DIR_PATH"
files = sorted(glob.glob(os.path.join(site_dir, "optimized-*.html")))
if not files:
    files = sorted(glob.glob(os.path.join(site_dir, "capture-*.html")))

results = {"pages": [], "css_vars": {}, "html_vars": ""}
all_css_vars = {}

for fpath in files:
    html = open(fpath).read()
    fname = os.path.basename(fpath)

    if not results["html_vars"]:
        hm = re.search(r'<html[^>]*style="([^"]*)"', html)
        if hm: results["html_vars"] = hm.group(1)

    styles = re.findall(r'<style[^>]*>(.*?)</style>', html, re.DOTALL)
    for s in styles:
        for name, val in re.findall(r'(--[a-zA-Z0-9_-]+)\s*:\s*([^;}{]+)', s):
            key = name.strip()
            v = val.strip()
            if key not in all_css_vars or len(v) > len(all_css_vars[key]):
                all_css_vars[key] = v

    body = re.search(r'<body[^>]*>(.*)</body>', html, re.DOTALL)
    body_html = body.group(1) if body else ''
    body_html = re.sub(r'<style[^>]*>.*?</style>', '', body_html, flags=re.DOTALL)
    body_html = re.sub(r'<script[^>]*>.*?</script>', '', body_html, flags=re.DOTALL)
    body_html = re.sub(r'data:image/[^"]*', '', body_html)
    body_html = re.sub(r'\s+', ' ', body_html)
    texts = [t.strip() for t in re.findall(r'>([^<]{2,})<', body_html) if t.strip() and not t.strip().startswith('{')]
    results["pages"].append({"file": fname, "texts": texts[:40], "text_count": len(texts)})

results["css_vars"] = {
    "colors": {k: v for k, v in all_css_vars.items() if any(x in k for x in ['color','bg','border','text','shadow','accent','brand','fill','stroke','foreground','background'])},
    "spacing": {k: v for k, v in all_css_vars.items() if any(x in k for x in ['spacing','gap','padding','margin','radius','size','height','width'])},
    "fonts": {k: v for k, v in all_css_vars.items() if any(x in k for x in ['font','line-height','letter','weight'])},
}
print(json.dumps(results, indent=2))
PYEOF
```

---

## STEP 2: Identify components and sections

From Step 1 outlines, categorize what you found:

### UI Primitives (small, reusable)
These are generic components used across multiple pages:
- Buttons (every variant: primary, secondary, ghost, icon, destructive)
- Input fields (text, search, textarea)
- Toggle switches
- Select/dropdown
- Tabs
- Badges/tags
- Avatar
- Card container
- Divider
- Keyboard shortcut badge
- Progress bar
- Checkbox/radio

### Full Sections (exact replicas)
These are COMPLETE sections visible on the site — not abstract components but pixel-perfect copies:
- Navigation bar / header (exactly as it appears)
- Sidebar (exactly as it appears, with all nav items)
- Hero section(s) — if the site has marketing pages, capture EACH unique hero
- Footer (exactly as it appears)
- Pricing section (if exists)
- Feature grid/cards section (if exists)
- CTA section (if exists)
- Settings panel (if exists)
- Chat/conversation view (if exists)
- Any other distinctive full-width section

**IMPORTANT**: If multiple pages share the same section (e.g. same navbar), include it ONCE.
If pages have DIFFERENT versions (e.g. two different heroes), include BOTH with descriptive names.

### Complete Pages (full page replicas — one per unique type)
From the captured pages, identify unique page TYPES:
- If multiple pages share the same layout and structure (e.g. 5 settings pages), create ONE page component
- If a page is visually distinct (e.g. home vs settings vs chat), it gets its own page component
- Each page component assembles sections + UI components into the COMPLETE view
- Include real content from the source, not placeholders

### Layouts (page shells)
- Sidebar + main content
- Full-width centered
- Settings (sidebar nav + content panel)
- Detail view with side panel

---

## STEP 3: Generate theme.ts

```typescript
// theme.ts — Design tokens extracted from [site name]
// DO NOT modify these values — they are exact extractions from the source

export const colors = {
  // Backgrounds
  page: "[exact value]",
  surface: "[exact value]",
  elevated: "[exact value]",
  // ... all background colors

  // Text
  textPrimary: "[exact value]",
  textSecondary: "[exact value]",
  textTertiary: "[exact value]",
  textMuted: "[exact value]",

  // Borders
  borderDefault: "[exact value]",
  borderSubtle: "[exact value]",

  // Accent/Brand
  accent: "[exact value]",
  accentHover: "[exact value]",

  // Status
  success: "[exact value]",
  error: "[exact value]",
  warning: "[exact value]",
} as const;

export const spacing = {
  // Extract the actual spacing values used
} as const;

export const radius = {
  sm: "[value]",
  md: "[value]",
  lg: "[value]",
  xl: "[value]",
  full: "9999px",
} as const;

export const typography = {
  fontSans: "[exact font-family]",
  fontMono: "[exact font-family]",

  // Size scale — every unique size found
  sizes: {
    xs: "[value]",
    sm: "[value]",
    base: "[value]",
    lg: "[value]",
    xl: "[value]",
    "2xl": "[value]",
  },

  weights: {
    normal: "[value]",
    medium: "[value]",
    semibold: "[value]",
    bold: "[value]",
  },
} as const;
```

---

## STEP 4: Generate UI primitives (PARALLEL — one sub-agent per component group)

Each UI component should:
- Be a `.tsx` file with TypeScript props interface
- Use Tailwind CSS with arbitrary values matching the design tokens
- Import colors/spacing from `theme.ts` where helpful for documentation
- Include all variants as props (e.g. `variant="primary" | "secondary" | "ghost"`)
- Include all sizes if applicable (e.g. `size="sm" | "md" | "lg"`)
- Have proper `className` prop for extension
- Use exact colors/spacing — NEVER generic Tailwind classes

Example format:
```tsx
// ui/button.tsx
import { type ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled,
  className = "",
  onClick,
}: ButtonProps) {
  const base = "inline-flex items-center justify-center font-medium transition-colors";

  const variants = {
    primary: "bg-[#317cff] text-white hover:bg-[#2a6ae0] rounded-[6px]",
    secondary: "bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.9)] hover:bg-[rgba(255,255,255,0.08)] rounded-[6px] border border-[rgba(255,255,255,0.08)]",
    ghost: "bg-transparent text-[rgba(255,255,255,0.6)] hover:text-[rgba(255,255,255,0.9)] hover:bg-[rgba(255,255,255,0.05)] rounded-[6px]",
    destructive: "bg-[#f53b3a] text-white hover:bg-[#e03534] rounded-[6px]",
  };

  const sizes = {
    sm: "h-7 px-2.5 text-[12px] gap-1.5",
    md: "h-8 px-3 text-[13px] gap-2",
    lg: "h-9 px-4 text-[14px] gap-2",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${base} ${variants[variant]} ${sizes[size]} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${className}`}
    >
      {children}
    </button>
  );
}
```

---

## STEP 5: Generate sections (PARALLEL — exact replicas of visible blocks)

Sections are the **large visible blocks** you see on a page — not just small atoms.
Think of what a user actually SEES when they look at the page:

- The **hero section** on the home/landing page (the "What should we work on?" area with input, suggestion pills, controls)
- The **full sidebar** with all nav items, projects, chats, and footer
- The **navbar/header** bar
- The **footer** with all links
- The **pricing section** with cards and features
- The **settings panel** content area
- The **chat message thread** area
- The **code diff view** or **file tree** panel
- The **onboarding checklist** or **feature highlight** blocks
- **Any other large, visually distinct block** that appears on the site

Each section should:
- Be a complete, self-contained `.tsx` component
- Include ALL content exactly as it appears on the source page — every text, every icon, every link
- Include exact SVG icons (copy from source, do NOT fabricate)
- Use exact Tailwind classes with arbitrary values
- Be ready to drop into any Next.js/React page

```tsx
// sections/hero-home.tsx — The exact home page hero with chat input, suggestions, and controls
export function HeroHome() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6">
      <h1 className="text-[28px] font-medium text-white mb-8">What should we work on?</h1>
      {/* EXACT chat composer, suggestion pills, model selector, etc. */}
    </div>
  );
}
```

**For sections with dynamic content** (like a sidebar with nav items), use props:
```tsx
// sections/sidebar.tsx
interface SidebarProps {
  activeItem?: string;
}

export function Sidebar({ activeItem = "sessions" }: SidebarProps) {
  // ... exact layout from source with all nav items, projects, chats
  // Include DEFAULT content from the captured page — not empty
}
```

---

## STEP 6: Generate COMPLETE page replicas (CRITICAL — one per unique page type)

This is the **assembly guide**. Each page file shows how all the sections, layouts, and UI components fit together to create EXACTLY what the user sees.

**Rules:**
- Identify every UNIQUE page type from the captures (e.g. home, settings, chat, review, pricing)
- If 5 pages look the same, create ONE page component for that type
- If a page looks different from all others, it gets its own component
- Each page is a SINGLE `.tsx` file that renders the COMPLETE page
- Use the sections and UI components you already created
- Include real content from the source — not placeholder text

```tsx
// pages/home.tsx — Complete home/dashboard page
import { SidebarLayout } from "../layouts/sidebar-layout";
import { Sidebar } from "../sections/sidebar";
import { HeroHome } from "../sections/hero-home";

export function HomePage() {
  return (
    <SidebarLayout sidebar={<Sidebar activeItem="sessions" />}>
      <HeroHome />
    </SidebarLayout>
  );
}
```

```tsx
// pages/settings.tsx — Complete settings page
import { SettingsLayout } from "../layouts/settings-layout";
import { SettingsSidebar } from "../sections/settings-sidebar";
import { SettingsGeneral } from "../sections/settings-general";

export function SettingsPage() {
  return (
    <SettingsLayout sidebar={<SettingsSidebar activeItem="general" />}>
      <SettingsGeneral />
    </SettingsLayout>
  );
}
```

```tsx
// pages/chat.tsx — Complete chat/session page with messages
import { SidebarLayout } from "../layouts/sidebar-layout";
import { Sidebar } from "../sections/sidebar";
import { ChatThread } from "../sections/chat-thread";

export function ChatPage() {
  return (
    <SidebarLayout sidebar={<Sidebar activeItem="sessions" />}>
      <ChatThread />
    </SidebarLayout>
  );
}
```

**Generate a page for EVERY unique page type found in the captures.**

---

## STEP 7: Generate layouts

```tsx
// layouts/sidebar-layout.tsx
interface SidebarLayoutProps {
  sidebar?: ReactNode;
  children: ReactNode;
}

export function SidebarLayout({ sidebar, children }: SidebarLayoutProps) {
  return (
    <div className="flex h-screen bg-[#141414]">
      <aside className="w-[300px] shrink-0 border-r border-[rgba(255,255,255,0.08)] bg-[#191919]">
        {sidebar}
      </aside>
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
```

---

## STEP 8: Generate components.html preview

Create a single HTML file using Tailwind CSS (NO React/Babel CDN — just plain HTML + Tailwind for reliable rendering).

The preview should show:
1. **Color palette** swatches
2. **Typography** samples
3. **Every UI component** with all variants
4. **Every section** rendered
5. **Every full page** rendered in a bordered frame (show the complete assembled page)

```html
<!DOCTYPE html>
<html class="dark">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <style type="text/tailwindcss">
    @theme {
      /* all color tokens */
    }
  </style>
</head>
<body class="bg-[PAGE_BG] text-[TEXT_PRIMARY] p-6" style="font-family: FONT">

  <!-- Section: Color Palette -->
  <!-- Section: Typography -->
  <!-- Section: Each UI component -->
  <!-- Section: Each section -->

  <!-- Section: Full Page Replicas -->
  <div class="mb-10">
    <div class="text-[11px] uppercase tracking-wider text-white/30 mb-3">Full Page: Home</div>
    <div class="border border-white/10 rounded-lg overflow-hidden" style="height:600px">
      <!-- Complete home page assembled with all components -->
    </div>
  </div>

  <div class="mb-10">
    <div class="text-[11px] uppercase tracking-wider text-white/30 mb-3">Full Page: Settings</div>
    <div class="border border-white/10 rounded-lg overflow-hidden" style="height:600px">
      <!-- Complete settings page assembled with all components -->
    </div>
  </div>

  <!-- ... one frame per unique page type -->

</body>
</html>
```

**IMPORTANT**: Use plain HTML + Tailwind for the preview, NOT React/Babel CDN. The React components in the `components/` folder are for the user's project. The preview is just for visual reference.

---

## STEP 9: Generate index.ts barrel export

```typescript
// components/index.ts
export * from "./ui/button";
export * from "./ui/input";
// ... all UI components

export * from "./sections/navbar";
export * from "./sections/sidebar";
export * from "./sections/hero-home";
// ... all sections

export * from "./pages/home";
export * from "./pages/settings";
export * from "./pages/chat";
// ... all page replicas

export * from "./layouts/sidebar-layout";
// ... all layouts

export { colors, spacing, radius, typography } from "./theme";
```

---

## RULES

- NEVER fabricate content — every word, icon, and color from the source
- NEVER use generic Tailwind colors — always exact values like `bg-[#141414]`
- NEVER guess SVG icons — copy exact `<svg>` from source or use `{/* icon: NAME */}`
- ALL colors as arbitrary Tailwind values, not theme references
- TypeScript with proper interfaces for all props
- Each file should be independently usable
- Sections must be EXACT replicas of what appears on the site
- If two pages have different versions of the same section, create both
