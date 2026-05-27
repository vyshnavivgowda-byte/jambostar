/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: false,   // 👈 ADD THIS
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'damsijnioqexdsozebri.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

module.exports = nextConfig;