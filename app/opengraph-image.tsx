import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// The share card for every page: the preview LinkedIn, X, and Slack show
// when someone posts a link to Heard.

export const alt =
  "Heard — See if you're being represented. Vote on real bills. See how often your reps vote like you.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand tokens from app/globals.css.
const canvas = "#0a1628";
const ink = "#f5f1eb";
const ink2 = "#c1cad8";
const goldGradient = "linear-gradient(120deg, #f5f1eb 10%, #e0c372 60%, #c9a84c 100%)";

// Satori doesn't size flex children from their content the way a browser
// does, so the text columns get explicit widths.
const gutter = 80;
const contentWidth = size.width - gutter * 2;

export default async function Image() {
  // Literal paths so Turbopack traces just these files, not the whole project.
  const [mark, brandSemiBold, brandBold, interRegular] = await Promise.all([
    readFile(join(process.cwd(), "app/icon.svg"), "base64"),
    readFile(join(process.cwd(), "assets/fonts/CormorantUnicase-SemiBold.ttf")),
    readFile(join(process.cwd(), "assets/fonts/CormorantUnicase-Bold.ttf")),
    readFile(join(process.cwd(), "assets/fonts/Inter-Regular.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: size.width,
          height: size.height,
          padding: `72px ${gutter}px`,
          backgroundColor: canvas,
          color: ink,
          fontFamily: "Inter",
        }}
      >
        {/* .bg-hero-glow */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: size.width,
            height: size.height,
            backgroundImage:
              "radial-gradient(960px 480px at 85% -10%, rgba(201, 168, 76, 0.13), transparent 60%), radial-gradient(800px 480px at -10% 10%, rgba(56, 98, 170, 0.18), transparent 60%)",
          }}
        />
        {/* .bg-grid */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: size.width,
            height: size.height,
            backgroundImage:
              "linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse at top, black 30%, transparent 75%)",
          }}
        />

        {/* Logo lockup, as in components/ui/Logo.tsx */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 64,
              height: 64,
              backgroundImage: `url(data:image/svg+xml;base64,${mark})`,
              backgroundSize: "64px 64px",
            }}
          />
          <div
            style={{
              fontFamily: "Cormorant Unicase",
              fontWeight: 700,
              fontSize: 56,
              letterSpacing: 1.4,
              lineHeight: 1,
            }}
          >
            Heard
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", width: contentWidth }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: contentWidth,
              fontFamily: "Cormorant Unicase",
              fontWeight: 600,
              fontSize: 108,
              lineHeight: 1.02,
            }}
          >
            <div style={{ display: "flex", width: contentWidth }}>See if you’re being</div>
            {/* Shrink-wrapped like the site's .text-gold-gradient span, so the gradient spans just the word */}
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                backgroundImage: goldGradient,
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              represented
            </div>
          </div>
          <div
            style={{
              display: "flex",
              width: contentWidth,
              marginTop: 32,
              fontSize: 36,
              lineHeight: 1.4,
              color: ink2,
            }}
          >
            Vote on real bills. See how often your reps vote like you.
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Cormorant Unicase", data: brandSemiBold, weight: 600, style: "normal" },
        { name: "Cormorant Unicase", data: brandBold, weight: 700, style: "normal" },
        { name: "Inter", data: interRegular, weight: 400, style: "normal" },
      ],
    },
  );
}
