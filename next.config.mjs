/** @type {import('next').NextConfig} */

// Security headers sent with every page.
//  - frame-ancestors / X-Frame-Options: other sites can't embed Ile in a frame
//    (stops clickjacking, e.g. a fake page tricking someone into "Delete").
//  - object-src / base-uri / form-action: closes common script-injection tricks.
//  - nosniff: browsers won't treat an uploaded file as a script or page.
//  - HSTS: browsers always use HTTPS once they've seen the site.
// script-src is not locked down yet: Next.js needs inline scripts, and a
// strict nonce-based policy would make every page dynamic. React already
// escapes all user text, which is the main XSS defence.
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
