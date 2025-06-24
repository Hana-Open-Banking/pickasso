/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: true,
  compiler: {
    // Enable SWC compiler
    styledComponents: true,
  },
}

module.exports = nextConfig
