import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

export default function GettingStartedPage() {
  return (
    <div className="flex flex-col flex-1">
      <Header />

      <section className="w-full flex justify-center" style={{ padding: "80px 32px" }}>
        <div className="w-full" style={{ maxWidth: "800px" }}>
          <Link
            href="/docs"
            className="no-underline"
            style={{
              fontSize: "14px",
              fontWeight: 500,
              lineHeight: "22.96px",
              letterSpacing: "-0.14px",
              color: "rgba(255, 255, 255, 0.6)",
              marginBottom: "24px",
              display: "inline-block",
            }}
          >
            &larr; Back to Docs
          </Link>

          <h1
            style={{
              fontSize: "47.1587px",
              fontWeight: 500,
              lineHeight: "54.6704px",
              letterSpacing: "-1.39793px",
              color: "rgb(255, 255, 255)",
              margin: "0 0 16px",
            }}
          >
            Getting Started
          </h1>
          <p
            style={{
              fontSize: "17.8948px",
              fontWeight: 500,
              lineHeight: "28px",
              letterSpacing: "-0.178948px",
              color: "rgba(255, 255, 255, 0.6)",
              margin: "0 0 48px",
            }}
          >
            Get up and running with Design Grab in under a minute.
          </p>

          {/* Step 1 */}
          <div style={{ marginBottom: "48px" }}>
            <h2
              style={{
                fontSize: "21.8948px",
                fontWeight: 500,
                lineHeight: "27.5244px",
                letterSpacing: "-0.218948px",
                color: "rgb(255, 255, 255)",
                margin: "0 0 16px",
              }}
            >
              1. Install the Chrome Extension
            </h2>
            <p
              style={{
                fontSize: "17px",
                fontWeight: 500,
                lineHeight: "27.999px",
                letterSpacing: "-0.17px",
                color: "rgba(255, 255, 255, 0.6)",
                margin: "0 0 16px",
              }}
            >
              Install the Design Grab Chrome extension from the Chrome Web Store or load it as an unpacked extension from the repository.
            </p>
            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                borderRadius: "6.08px",
                padding: "16px 20px",
                fontFamily: "monospace",
                fontSize: "14px",
                lineHeight: "22px",
                color: "rgb(255, 255, 255)",
                overflowX: "auto",
              }}
            >
              <code>git clone https://github.com/kartikk-k/designgrab</code>
              <br />
              <code>cd designgrab && bun install</code>
              <br />
              <code style={{ color: "rgba(255, 255, 255, 0.44)" }}># Load extension/ folder as unpacked in chrome://extensions</code>
            </div>
          </div>

          {/* Step 2 */}
          <div style={{ marginBottom: "48px" }}>
            <h2
              style={{
                fontSize: "21.8948px",
                fontWeight: 500,
                lineHeight: "27.5244px",
                letterSpacing: "-0.218948px",
                color: "rgb(255, 255, 255)",
                margin: "0 0 16px",
              }}
            >
              2. Start the local server
            </h2>
            <p
              style={{
                fontSize: "17px",
                fontWeight: 500,
                lineHeight: "27.999px",
                letterSpacing: "-0.17px",
                color: "rgba(255, 255, 255, 0.6)",
                margin: "0 0 16px",
              }}
            >
              The local dashboard server receives captures from the extension and generates your design.md files.
            </p>
            <div
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                borderRadius: "6.08px",
                padding: "16px 20px",
                fontFamily: "monospace",
                fontSize: "14px",
                lineHeight: "22px",
                color: "rgb(255, 255, 255)",
                overflowX: "auto",
              }}
            >
              <code>bun run server.ts</code>
              <br />
              <code style={{ color: "rgba(255, 255, 255, 0.44)" }}># Dashboard available at http://localhost:3847</code>
            </div>
          </div>

          {/* Step 3 */}
          <div style={{ marginBottom: "48px" }}>
            <h2
              style={{
                fontSize: "21.8948px",
                fontWeight: 500,
                lineHeight: "27.5244px",
                letterSpacing: "-0.218948px",
                color: "rgb(255, 255, 255)",
                margin: "0 0 16px",
              }}
            >
              3. Capture a website
            </h2>
            <p
              style={{
                fontSize: "17px",
                fontWeight: 500,
                lineHeight: "27.999px",
                letterSpacing: "-0.17px",
                color: "rgba(255, 255, 255, 0.6)",
                margin: "0 0 16px",
              }}
            >
              Navigate to any website (e.g. openai.com), click the Design Grab extension icon, and hit &quot;Capture&quot;. The page&apos;s DOM and computed styles are sent to your local server.
            </p>
          </div>

          {/* Step 4 */}
          <div style={{ marginBottom: "48px" }}>
            <h2
              style={{
                fontSize: "21.8948px",
                fontWeight: 500,
                lineHeight: "27.5244px",
                letterSpacing: "-0.218948px",
                color: "rgb(255, 255, 255)",
                margin: "0 0 16px",
              }}
            >
              4. Use your design.md
            </h2>
            <p
              style={{
                fontSize: "17px",
                fontWeight: 500,
                lineHeight: "27.999px",
                letterSpacing: "-0.17px",
                color: "rgba(255, 255, 255, 0.6)",
                margin: "0 0 16px",
              }}
            >
              Open the dashboard at localhost:3847 to view, copy, or download your generated design.md. Use it as a reference for building UIs that match the captured website&apos;s design system.
            </p>
          </div>

          <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.2)", paddingTop: "24px" }}>
            <Link
              href="/docs/how-it-works"
              className="no-underline"
              style={{
                fontSize: "14px",
                fontWeight: 500,
                letterSpacing: "-0.14px",
                color: "rgb(255, 255, 255)",
              }}
            >
              Next: How It Works &rarr;
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
