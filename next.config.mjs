/** @type {import('next').NextConfig} */
const nextConfig = {
  // les stories PNG lisent les polices et les portraits sur le disque
  outputFileTracingIncludes: {
    '/api/story/[tour]': ['./assets/fonts/**/*', './public/photos/**/*'],
    '/scriptable': ['./scriptable/**/*'],
  },
};

export default nextConfig;
