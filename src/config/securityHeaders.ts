export function buildCsp(isDev = false): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co${isDev ? ' ws: http://localhost:*' : ''}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join('; ');
}

export const STATIC_SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self)',
  'Cross-Origin-Opener-Policy': 'same-origin'
};

export function securityHeaders(isDev = false): Array<{ key: string; value: string }> {
  return [
    ...Object.entries(STATIC_SECURITY_HEADERS).map(([key, value]) => ({ key, value })),
    { key: 'Content-Security-Policy', value: buildCsp(isDev) }
  ];
}