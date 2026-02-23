/** @type {import('next').NextConfig} */
const nextConfig = {
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
        hostname: 'damsijnioqexdsozebri.supabase.co', // Your specific Supabase ID
        port: '',
        pathname: '/storage/v1/object/public/**', // Limits it to your public buckets
      },
    ],
  },
};

module.exports = nextConfig;