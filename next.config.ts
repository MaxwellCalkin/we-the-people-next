import type { NextConfig } from "next";

// Sent on every response, including pages the proxy skips (/login, /signup,
// /onboarding) and API routes. X-Frame-Options blocks clickjacking, which
// matters most on the login page.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "www.congress.gov",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async redirects() {
    return [
      // Google sign-in only completes on heard-us.vercel.app, so send the old
      // domain there instead of letting sign-in fail on it.
      {
        source: "/:path*",
        has: [{ type: "host", value: "we-the-people-next.vercel.app" }],
        destination: "https://heard-us.vercel.app/:path*",
        permanent: true,
      },
      {
        source: "/feed",
        destination: "/proposals",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
