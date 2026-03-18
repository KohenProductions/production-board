/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["bcrypt", "@sparticuz/chromium", "puppeteer-core"],
    outputFileTracingIncludes: {
      "/api/pdf/project": ["node_modules/@sparticuz/chromium/**"],
      "/api/pdf/shoot-day": ["node_modules/@sparticuz/chromium/**"],
    },
  },
};

module.exports = nextConfig;