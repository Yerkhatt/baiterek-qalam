/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  transpilePackages: ["@qalam/form-engine", "@xyflow/react", "@xyflow/system"]
};

export default nextConfig;
