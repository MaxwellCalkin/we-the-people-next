import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
