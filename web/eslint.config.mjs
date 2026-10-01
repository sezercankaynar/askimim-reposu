import nextConfig from "eslint-config-next";

const config = [...nextConfig, { ignores: [".next/**", "public/sw.js", "node_modules/**"] }];

export default config;
