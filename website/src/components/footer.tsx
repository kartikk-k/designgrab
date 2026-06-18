import Link from "next/link";

export function Footer() {
  const linkStyle = { fontSize: "13px", fontWeight: 500, lineHeight: "19.68px", color: "rgba(255, 255, 255, 0.6)" } as const;
  const headingStyle = { fontSize: "14px", fontWeight: 600, lineHeight: "22.96px", letterSpacing: "-0.14px", color: "rgb(255, 255, 255)" } as const;

  return (
    <footer
      className="w-full flex flex-col items-center"
      style={{ backgroundColor: "rgb(0, 0, 0)", borderTop: "1px solid rgba(255, 255, 255, 0.2)" }}
    >
      <div
        className="w-full flex flex-col sm:flex-row justify-between"
        style={{ maxWidth: "1384px", padding: "48px 32px", gap: "48px" }}
      >
        <div className="flex flex-col" style={{ gap: "12px" }}>
          <span style={headingStyle}>Product</span>
          <Link href="/collections" className="no-underline" style={linkStyle}>Collections</Link>
          <Link href="/docs" className="no-underline" style={linkStyle}>Documentation</Link>
          <a href="https://chromewebstore.google.com/detail/mnnjngmbigmldgnpfomjbioediaehdgj?utm_source=item-share-cb" target="_blank" rel="noopener noreferrer" className="no-underline" style={linkStyle}>Chrome Extension</a>
        </div>
        <div className="flex flex-col" style={{ gap: "12px" }}>
          <span style={headingStyle}>Resources</span>
          <Link href="/docs/getting-started" className="no-underline" style={linkStyle}>Getting Started</Link>
          <Link href="/docs/how-it-works" className="no-underline" style={linkStyle}>How It Works</Link>
          <Link href="/about" className="no-underline" style={linkStyle}>About</Link>
        </div>
        <div className="flex flex-col" style={{ gap: "12px" }}>
          <span style={headingStyle}>Community</span>
          <a href="https://github.com/kartikk-k/designgrab" target="_blank" rel="noopener noreferrer" className="no-underline" style={linkStyle}>GitHub</a>
          <a href="https://github.com/kartikk-k/designgrab/issues" target="_blank" rel="noopener noreferrer" className="no-underline" style={linkStyle}>Issues</a>
          <Link href="/contact" className="no-underline" style={linkStyle}>Contact</Link>
        </div>
        <div className="flex flex-col" style={{ gap: "12px", maxWidth: "300px" }}>
          <span style={headingStyle}>Design Grab</span>
          <p style={{ ...linkStyle, margin: 0 }}>
            Open source tool to extract and clone any website&apos;s design system. Built for designers and developers.
          </p>
        </div>
      </div>
      <div
        className="w-full flex flex-col sm:flex-row justify-between items-center"
        style={{
          maxWidth: "1384px",
          padding: "16px 32px 24px",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          gap: "12px",
        }}
      >
        <span style={{ fontSize: "12px", fontWeight: 500, color: "rgba(255, 255, 255, 0.3)" }}>
          &copy; {new Date().getFullYear()} Design Grab. All rights reserved.
        </span>
        <div className="flex" style={{ gap: "20px" }}>
          <Link href="/terms" className="no-underline" style={{ fontSize: "12px", fontWeight: 500, color: "rgba(255, 255, 255, 0.3)" }}>Terms</Link>
          <Link href="/privacy" className="no-underline" style={{ fontSize: "12px", fontWeight: 500, color: "rgba(255, 255, 255, 0.3)" }}>Privacy</Link>
          <Link href="/contact" className="no-underline" style={{ fontSize: "12px", fontWeight: 500, color: "rgba(255, 255, 255, 0.3)" }}>Contact</Link>
        </div>
      </div>
    </footer>
  );
}
