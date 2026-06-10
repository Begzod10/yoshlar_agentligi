/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: [
    "100.127.147.5",
  ],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://agency.gennis.uz/api/:path*",
      },
    ];
  },
}

export default nextConfig
