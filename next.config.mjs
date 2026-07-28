// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   typescript: {
//     ignoreBuildErrors: true,
//   },
//   images: {
//     unoptimized: true,
//   },
// }

// export default nextConfig


/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  // ── Increase body size limit for all API routes (App Router) ──────────────
  // Note: config.api.bodyParser only works in Pages Router (/pages/api)
  // For App Router, use this experimental config for Server Actions,
  // and handle large bodies via streaming (req.arrayBuffer / req.text)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',  // for any Server Actions
    },
  },

  // ── Response headers — allow Drive CORS for direct browser uploads ────────
  async headers() {
    return [
      {
        // Allow Drive's upload domain to be called from browser
        source: '/api/meetings/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin',  value: '*'                                },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization, x-content-range, x-content-length' },
        ],
      },
    ]
  },
}

export default nextConfig