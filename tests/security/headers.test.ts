import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildCsp, STATIC_SECURITY_HEADERS } from '../../src/config/securityHeaders';

const file = readFileSync(join(process.cwd(), 'public', '_headers'), 'utf8');
const block = file.split(/\r?\n\r?\n/).find((b) => /^\/\*\s*$/m.test(b)) ?? '';
const parsed = Object.fromEntries(
  block.split(/\r?\n/).filter((l) => /^\s+\S/.test(l)).map((l) => {
    const i = l.indexOf(':');
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  })
);

describe('en-têtes de sécurité : public/_headers = next.config.ts', () => {
  it('contient CSP, HSTS, nosniff, Referrer-Policy', () => {
    for (const h of ['Content-Security-Policy', 'Strict-Transport-Security', 'X-Content-Type-Options', 'Referrer-Policy']) {
      expect(parsed[h], h).toBeTruthy();
    }
  });
  it('les en-têtes statiques sont identiques', () => {
    for (const [k, v] of Object.entries(STATIC_SECURITY_HEADERS)) expect(parsed[k]).toBe(v);
  });
  it('la CSP de production est identique et interdit frames / objets', () => {
    expect(parsed['Content-Security-Policy']).toBe(buildCsp(false));
    expect(buildCsp(false)).toContain("frame-ancestors 'none'");
    expect(buildCsp(false)).toContain("object-src 'none'");
    expect(buildCsp(false)).not.toContain('unsafe-eval');
  });
});