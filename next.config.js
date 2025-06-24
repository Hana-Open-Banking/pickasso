/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: true,
  compiler: {
    // Enable SWC compiler
    styledComponents: true,
  },
  experimental: {
    forceSwcTransforms: true, // Force SWC transforms even if Babel is present
  },
}

module.exports = nextConfig
