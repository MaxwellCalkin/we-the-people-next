// @vitest-environment node
// The preview LinkedIn, X, and Slack show for a shared link. Crawlers lay the
// card out from the og:image:width/height tags, so the PNG must really be
// 1200×630, and it must render with the brand fonts in assets/fonts.
import { describe, expect, it } from "vitest";
import ShareCard from "../opengraph-image";

describe("share card", () => {
  it("renders as a 1200×630 PNG", async () => {
    const response = await ShareCard();
    const png = Buffer.from(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(png.toString("latin1", 1, 4)).toBe("PNG");
    expect(png.toString("latin1", 12, 16)).toBe("IHDR");
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });
});
