import Link from "next/link";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import GradientShader from "@/components/gradient-shader";
import {
  POPULAR_SLUGS,
  collectionLogoFilter,
  collections,
  type CollectionEntry,
} from "@/data/collections";

/** Minimal line icons for the “How it works” steps — white stroke, no fill. */
function HowItWorksIllustration({ step }: { step: string }) {
  const stroke = "rgb(255, 255, 255)";
  const p = {
    fill: "none" as const,
    stroke,
    strokeWidth: 1.15,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg
      viewBox="0 0 80 54"
      width={112}
      height={76}
      aria-hidden
      style={{ display: "block", marginBottom: "20px", opacity: 0.96 }}
    >
      {step === "01" && (
        <>
          {/* Browser + plus (install) */}
          <rect x="4" y="7" width="72" height="40" rx="2.5" {...p} />
          <line x1="4" y1="15" x2="76" y2="15" {...p} />
          <path d="M40 25v11M34.5 30.5h11" {...p} />
        </>
      )}
      {step === "02" && (
        <>
          {/* Browser + viewfinder (capture) */}
          <rect x="4" y="7" width="72" height="40" rx="2.5" {...p} />
          <line x1="4" y1="15" x2="76" y2="15" {...p} />
          {/* Corner brackets open toward center — reads as a camera / selection frame */}
          <path
            d="M26 22h11M26 22v11M54 22h-11M54 22v11M26 36h11M26 36v-11M54 36h-11M54 36v-11"
            {...p}
            strokeWidth={1.35}
          />
          <path
            d="M40 26.5v5M36.5 29.5h7"
            {...p}
            strokeWidth={1}
            strokeOpacity={0.5}
          />
        </>
      )}
      {step === "03" && (
        <>
          {/* Document + folded corner (design file) */}
          <path d="M22 7h28v10h10v28H22z" {...p} />
          <line x1="30" y1="27" x2="54" y2="27" {...p} />
          <line x1="30" y1="33" x2="54" y2="33" {...p} />
          <line x1="30" y1="39" x2="46" y2="39" {...p} />
        </>
      )}
    </svg>
  );
}

const popularCollections = POPULAR_SLUGS.map((slug) => collections.find((c) => c.slug === slug)).filter(
  (c): c is CollectionEntry => c != null,
);

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      <Header />

      {/* Hero */}
      <section className="w-full flex justify-center" style={{ padding: "120px 32px 80px" }}>
        <div className="flex flex-col items-center text-center" style={{ maxWidth: "800px" }}>
          <div
            className="inline-flex items-center justify-center"
            style={{
              height: "36px",
              padding: "0 16px",
              backgroundColor: "rgba(255, 255, 255, 0.12)",
              borderRadius: "9999px",
              fontSize: "14px",
              fontWeight: 500,
              letterSpacing: "-0.14px",
              color: "rgb(255, 255, 255)",
              marginBottom: "24px",
            }}
          >
            Open Source
          </div>
          <h1
            style={{
              fontSize: "62.3174px",
              fontWeight: 500,
              lineHeight: "62.5529px",
              letterSpacing: "-1.86952px",
              color: "rgb(255, 255, 255)",
              margin: "0 0 24px",
            }}
          >
            Clone any website&apos;s design system
          </h1>
          <p
            style={{
              fontSize: "17.8948px",
              fontWeight: 500,
              lineHeight: "28px",
              letterSpacing: "-0.178948px",
              color: "rgba(255, 255, 255, 0.6)",
              margin: "0 0 40px",
              maxWidth: "600px",
            }}
          >
            Extract colors, typography, spacing, and components from any website in seconds.
            Get a complete design.md with everything you need to replicate any design system.
          </p>
          <div className="flex items-center flex-wrap justify-center" style={{ gap: "12px" }}>
            <a
              href="https://chromewebstore.google.com/detail/mnnjngmbigmldgnpfomjbioediaehdgj?utm_source=item-share-cb"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center no-underline"
              style={{
                height: "40px",
                padding: "0 20px",
                backgroundColor: "rgb(255, 255, 255)",
                borderRadius: "40px",
                color: "rgb(0, 0, 0)",
                fontSize: "14px",
                fontWeight: 500,
                letterSpacing: "-0.14px",
              }}
            >
              Install Extension
            </a>
            <a
              href="https://github.com/kartikk-k/designgrab"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center no-underline"
              style={{
                height: "40px",
                padding: "0 20px",
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                borderRadius: "40px",
                color: "rgb(255, 255, 255)",
                fontSize: "14px",
                fontWeight: 500,
                letterSpacing: "-0.14px",
              }}
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="w-full flex justify-center" style={{ padding: "80px 32px" }}>
        <div className="w-full" style={{ maxWidth: "1384px" }}>
          <h2
            className="text-center"
            style={{
              fontSize: "29.6845px",
              fontWeight: 500,
              lineHeight: "39.1835px",
              letterSpacing: "-0.296845px",
              color: "rgb(255, 255, 255)",
              margin: "0 0 48px",
            }}
          >
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: "24px" }}>
            {[
              {
                step: "01",
                title: "Install the extension",
                desc: "Add the Chrome extension to your browser. One click setup, no configuration needed.",
              },
              {
                step: "02",
                title: "Capture any website",
                desc: "Navigate to any website and click capture. The extension extracts all computed styles and DOM structure.",
              },
              {
                step: "03",
                title: "Get your design.md",
                desc: "Receive a structured design system file with colors, typography, spacing, components, and usage guidelines.",
              },
            ].map((item) => (
              <div
                key={item.step}
                style={{
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "6.08px",
                  padding: "32px",
                }}
              >
                <HowItWorksIllustration step={item.step} />
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    lineHeight: "22.96px",
                    letterSpacing: "-0.14px",
                    color: "rgba(255, 255, 255, 0.44)",
                  }}
                >
                  {item.step}
                </span>
                <h3
                  style={{
                    fontSize: "21.8948px",
                    fontWeight: 500,
                    lineHeight: "27.5244px",
                    letterSpacing: "-0.218948px",
                    color: "rgb(255, 255, 255)",
                    margin: "12px 0 8px",
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    lineHeight: "22.96px",
                    letterSpacing: "-0.14px",
                    color: "rgba(255, 255, 255, 0.6)",
                    margin: 0,
                  }}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Collections preview */}
      <section className="w-full flex justify-center" style={{ padding: "80px 32px" }}>
        <div className="w-full" style={{ maxWidth: "1384px" }}>
          <div className="flex items-center justify-between" style={{ marginBottom: "48px" }}>
            <h2
              style={{
                fontSize: "29.6845px",
                fontWeight: 500,
                lineHeight: "39.1835px",
                letterSpacing: "-0.296845px",
                color: "rgb(255, 255, 255)",
                margin: 0,
              }}
            >
              Popular collections
            </h2>
            <Link
              href="/collections"
              className="inline-flex items-center justify-center no-underline"
              style={{
                height: "36px",
                padding: "0 16px",
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                borderRadius: "9999px",
                color: "rgb(255, 255, 255)",
                fontSize: "14px",
                fontWeight: 500,
                letterSpacing: "-0.14px",
              }}
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: "24px" }}>
            {popularCollections.map((site) => {
              const logoFilter = collectionLogoFilter(site);
              return (
              <Link
                key={site.slug}
                href={`/collection/${site.slug}`}
                className="no-underline block"
                style={{
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "6.08px",
                  padding: "24px",
                  transition: "background-color 0.2s",
                }}
              >
                <div
                  style={{
                    height: "36px",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {/* Monochrome white on dark UI (SVGL assets are brand-colored or light-gray). */}
                  {site.logoUrl ? (
                    <img
                      src={site.logoUrl}
                      alt=""
                      width={160}
                      height={36}
                      loading="lazy"
                      decoding="async"
                      style={{
                        maxHeight: "36px",
                        maxWidth: "160px",
                        width: "auto",
                        height: "auto",
                        objectFit: "contain",
                        objectPosition: "left center",
                        ...(logoFilter ? { filter: logoFilter } : {}),
                      }}
                    />
                  ) : null}
                </div>
                <h3
                  style={{
                    fontSize: "21.8948px",
                    fontWeight: 500,
                    lineHeight: "27.5244px",
                    letterSpacing: "-0.218948px",
                    color: "rgb(255, 255, 255)",
                    margin: "0 0 8px",
                  }}
                >
                  {site.name}
                </h3>
                <p
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    lineHeight: "22.96px",
                    letterSpacing: "-0.14px",
                    color: "rgba(255, 255, 255, 0.6)",
                    margin: 0,
                  }}
                >
                  Colors, typography, components & more
                </p>
              </Link>
            );
            })}
          </div>
        </div>
      </section>

      {/* Chrome Extension CTA */}
      <section id="install" className="w-full flex justify-center" style={{ padding: "80px 32px" }}>
        <div
          className="relative w-full overflow-hidden"
          style={{
            maxWidth: "1384px",
            border: "1px solid rgba(15, 23, 42, 0.12)",
            borderRadius: "12px",
            isolation: "isolate",
          }}
        >
          <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
            <GradientShader mode="crop" />
          </div>
          <div
            className="relative z-10 flex w-full flex-col items-center text-center"
            style={{ padding: "64px 32px" }}
          >
            <h2
              style={{
                fontSize: "29.6845px",
                fontWeight: 500,
                lineHeight: "39.1835px",
                letterSpacing: "-0.296845px",
                color: "#fff",
                margin: "0 0 16px",
              }}
            >
              Chrome Extension
            </h2>
            <p
              style={{
                fontSize: "17px",
                fontWeight: 500,
                lineHeight: "27.999px",
                letterSpacing: "-0.17px",
                color: "#fff",
                margin: "0 0 32px",
                maxWidth: "500px",
              }}
            >
              Install the extension and start capturing design systems from any website you visit.
            </p>
            <a
              href="https://chromewebstore.google.com/detail/mnnjngmbigmldgnpfomjbioediaehdgj?utm_source=item-share-cb"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center no-underline"
              style={{
                height: "40px",
                padding: "0 20px",
                backgroundColor: "rgb(255, 255, 255)",
                borderRadius: "40px",
                color: "rgb(0, 0, 0)",
                fontSize: "14px",
                fontWeight: 500,
                letterSpacing: "-0.14px",
              }}
            >
              Add to Chrome
            </a>
          </div>
        </div>
      </section>

      {/* Open Source */}
      <section className="w-full flex justify-center" style={{ padding: "80px 32px" }}>
        <div className="flex flex-col items-center text-center" style={{ maxWidth: "600px" }}>
          <h2
            style={{
              fontSize: "29.6845px",
              fontWeight: 500,
              lineHeight: "39.1835px",
              letterSpacing: "-0.296845px",
              color: "rgb(255, 255, 255)",
              margin: "0 0 16px",
            }}
          >
            Fully open source
          </h2>
          <p
            style={{
              fontSize: "17px",
              fontWeight: 500,
              lineHeight: "27.999px",
              letterSpacing: "-0.17px",
              color: "rgba(255, 255, 255, 0.6)",
              margin: "0 0 32px",
            }}
          >
            Design Grab is open source and free to use. Contribute, extend, or self-host it yourself.
          </p>
          <a
            href="https://github.com/kartikk-k/designgrab"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center no-underline"
            style={{
              height: "40px",
              padding: "0 20px",
              backgroundColor: "rgba(255, 255, 255, 0.12)",
              borderRadius: "40px",
              color: "rgb(255, 255, 255)",
              fontSize: "14px",
              fontWeight: 500,
              letterSpacing: "-0.14px",
            }}
          >
            Star on GitHub
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
}
