/**
 * Public designgrab collections — mirrors `.data/<slug>/` in github.com/kartikk-k/designgrab
 */

export type CollectionExample = {
  title: string;
  description: string;
  /** When set, shows an “Open live site” action */
  url?: string;
};

/** Product / dashboard / feed UIs vs marketing one-pagers */
export type CollectionCategory = "web-app" | "landing";

export type CollectionEntry = {
  name: string;
  slug: string;
  category: CollectionCategory;
  logoUrl?: string;
  /** SVGL assets need inversion for white-on-black; local white SVGs should set false */
  logoInvert?: boolean;
  desc: string;
  tags: readonly string[];
  /** UI regions / components called out in this collection’s design.md */
  components?: readonly string[];
  /** Real builds that used this design.md as a style reference */
  examples?: readonly CollectionExample[];
};

export const COLLECTION_SECTION_LABEL: Record<CollectionCategory, { title: string; blurb: string }> = {
  "web-app": {
    title: "Web apps & apps",
    blurb: "Dense product UI—dashboards, editors, feeds, and flows meant to ship inside a product.",
  },
  landing: {
    title: "Landing pages",
    blurb: "Marketing and storytelling surfaces—heroes, sections, and conversion-focused layouts.",
  },
};

export function collectionLogoFilter(entry: Pick<CollectionEntry, "logoInvert">): string | undefined {
  return entry.logoInvert === false ? undefined : "brightness(0) invert(1)";
}

export const REGISTRY_BASE =
  "https://github.com/kartikk-k/designgrab/blob/main/registry";

export const REGISTRY_RAW_BASE =
  "https://raw.githubusercontent.com/kartikk-k/designgrab/main/registry";

export function componentsBlobUrl(slug: string) {
  return `${REGISTRY_BASE}/${slug}/components.html`;
}

export function componentsRawUrl(slug: string) {
  return `${REGISTRY_RAW_BASE}/${slug}/components.html`;
}

export function instructionsRawUrl(slug: string) {
  return `${REGISTRY_RAW_BASE}/${slug}/instructions.md`;
}

// Legacy — kept for backward compat
export function designMdBlobUrl(slug: string) {
  return `${REGISTRY_BASE}/${slug}/components.html`;
}

export function designMdRawUrl(slug: string) {
  return `${REGISTRY_RAW_BASE}/${slug}/components.html`;
}

export function installCommand(slug: string) {
  return `npx designgrab add ${slug}`;
}

export const POPULAR_SLUGS = [
  "codex-dark",
  "openai",
  "cursor",
  "gemini",
  "stripe",
  "vercel",
  "supabase",
] as const;

export const collections: readonly CollectionEntry[] = [
  {
    name: "Codex",
    slug: "codex-dark",
    category: "web-app",
    logoUrl: "/logos/codex.svg",
    logoInvert: false,
    desc: "OpenAI Codex agent experience—dark shell, minimal chrome, and clear hierarchy for code, tools, and conversation.",
    tags: ["Dark", "Developer", "Agent"],
    components: [
      "Page layouts (sidebar+main, settings, detail)",
      "Color palette & typography scale",
      "Sidebar navigation with SVG icons",
      "Chat composer & suggestion pills",
      "Buttons (primary, secondary, ghost, icon)",
      "Plugin cards",
      "Settings rows with toggles & controls",
      "Task result & diff views",
      "Code blocks & terminal panel",
      "Status badges & keyboard shortcuts",
    ],
  },
  {
    name: "Cursor",
    slug: "cursor",
    category: "web-app",
    logoUrl: "https://svgl.app/library/cursor_dark.svg",
    desc: "Developer-focused IDE interface with dark backgrounds, precise spacing, and monospace accent typography.",
    tags: ["Dark", "Developer", "Technical"],
    components: [
      "IDE shell & panels",
      "Tab bars",
      "Monospace editor chrome",
      "List rows & trees",
      "Status bar",
      "Command palette styling",
    ],
  },
  {
    name: "Gemini",
    slug: "gemini",
    category: "web-app",
    logoUrl: "https://svgl.app/library/gemini.svg",
    desc: "Google's AI product with clean surfaces, rounded elements, and a balanced light/dark color system.",
    tags: ["Clean", "Rounded", "Google"],
    components: ["Rounded surfaces", "Prompt input", "Card grids", "Chip & pill controls", "Marketing sections"],
  },
  {
    name: "Supabase",
    slug: "supabase",
    category: "web-app",
    logoUrl: "https://svgl.app/library/supabase.svg",
    desc: "Dark-first design with green accents, developer-friendly patterns, and clear information hierarchy.",
    tags: ["Dark", "Green", "Developer"],
    components: ["Dashboard shell", "Tables & data UI", "Green accent CTAs", "Sidebar navigation", "Code snippets"],
  },
  {
    name: "Harvey",
    slug: "harvey",
    category: "web-app",
    desc: "Legal AI with restrained elegance, serif accents, and muted professional tones.",
    tags: ["Professional", "Serif", "Legal"],
  },
  {
    name: "Stripe Atlas",
    slug: "stripe-atlas",
    category: "web-app",
    logoUrl: "https://svgl.app/library/stripe.svg",
    desc: "Focused startup incorporation flow with Stripe's refined design language adapted for forms and guides.",
    tags: ["Forms", "Startup", "Finance"],
    components: ["Multi-step forms", "Checklists", "Sidebar guides", "Summary panels", "Trust indicators"],
  },
  {
    name: "Tembo",
    slug: "tembo",
    category: "web-app",
    logoUrl: "https://svgl.app/library/tembo.svg",
    desc: "Cloud database platform with warm accents, clear dashboards, and developer-oriented component patterns.",
    tags: ["Dashboard", "Warm", "Database"],
    components: ["Product dashboard", "Warm accent CTAs", "Metric tiles", "Integration lists"],
  },
  {
    name: "Sarvam",
    slug: "sarvam",
    category: "web-app",
    desc: "Indian AI platform with vibrant colors, cultural design elements, and clear product storytelling.",
    tags: ["Vibrant", "AI", "Cultural"],
  },
  {
    name: "X (Twitter)",
    slug: "x",
    category: "web-app",
    logoUrl: "https://svgl.app/library/x.svg",
    desc: "Social media platform with high-density feeds, blue accents, and real-time interaction patterns.",
    tags: ["Social", "Feed", "Blue"],
    components: ["Dense feed layout", "Post composer", "Inline actions", "Tabs & segmented controls"],
  },
  {
    name: "OpenAI",
    slug: "openai",
    category: "landing",
    logoUrl: "https://svgl.app/library/openai_dark.svg",
    desc: "Pure black canvas with white typography and translucent layers. Tight tracking, medium weight, shadow-free design.",
    tags: ["Dark", "Minimal", "Editorial"],
    components: [
      "Marketing hero",
      "Primary navigation",
      "Typography scale",
      "Ghost & solid buttons",
      "Feature / value cards",
      "Footer & legal row",
      "Code & monospace blocks",
      "Subtle dividers & hairlines",
    ],
    examples: [
      {
        title: "GPU rental SaaS",
        description:
          "Dashboard and marketing surfaces built with this design.md as the reference for the black canvas, type rhythm, and minimal chrome.",
        // Add your public deployment when ready, e.g. url: "https://my-gpu-saas.vercel.app"
      },
    ],
  },
  {
    name: "Stripe",
    slug: "stripe",
    category: "landing",
    logoUrl: "https://svgl.app/library/stripe.svg",
    desc: "Refined gradients, precise grids, and a sophisticated color palette built for trust and developer experience.",
    tags: ["Gradient", "Precise", "Finance"],
    components: ["Gradient hero", "Bento grids", "Pricing tables", "Docs layout", "Forms & inputs", "Logos row"],
  },
  {
    name: "Vercel",
    slug: "vercel",
    category: "landing",
    logoUrl: "https://svgl.app/library/vercel_dark.svg",
    desc: "Monochrome minimalism with sharp geometry, tight spacing, and a focus on developer tools.",
    tags: ["Monochrome", "Minimal", "Developer"],
    components: ["Geometric hero", "Deployment cards", "Dark/light toggles", "CLI-style blocks", "Grid metrics"],
  },
] as const;

const bySlug = new Map(collections.map((c) => [c.slug, c]));

export function getCollection(slug: string): CollectionEntry | undefined {
  return bySlug.get(slug);
}

export function collectionLogoInitials(name: string) {
  return name
    .split(/[\s(&)]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}
