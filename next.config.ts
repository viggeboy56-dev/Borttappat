import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const parsedSupabaseUrl = supabaseUrl ? new URL(supabaseUrl) : null;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: parsedSupabaseUrl
      ? [{
          protocol: parsedSupabaseUrl.protocol === "http:" ? "http" : "https",
          hostname: parsedSupabaseUrl.hostname,
          port: parsedSupabaseUrl.port,
          pathname: "/storage/v1/object/sign/item-images/**",
        }]
      : [],
  },
};

export default nextConfig;
