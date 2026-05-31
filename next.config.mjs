/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Allow tour pages to be embedded in any external website
        source: '/tour/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: "frame-ancestors *" },
        ],
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'pub-9fe3ce4e74bf4132bd47f8f13a8cc435.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'images.wasi.co',
      },
    ],
  },
}

export default nextConfig
