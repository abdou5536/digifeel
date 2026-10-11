import { afterEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { isSameOriginRequest } from '../../src/lib/security';

const originalEnv = {
  appOrigin: process.env.APP_ORIGIN,
  nodeEnv: process.env.NODE_ENV
};
const mutableEnv = process.env as Record<string, string | undefined>;

afterEach(() => {
  if (originalEnv.appOrigin === undefined) delete mutableEnv.APP_ORIGIN;
  else mutableEnv.APP_ORIGIN = originalEnv.appOrigin;
  if (originalEnv.nodeEnv === undefined) delete mutableEnv.NODE_ENV;
  else mutableEnv.NODE_ENV = originalEnv.nodeEnv;
});

describe('protection contre les requêtes cross-origin', () => {
  it('accepte une origine identique et refuse une origine étrangère', () => {
    mutableEnv.APP_ORIGIN = 'https://digifeel.example';
    mutableEnv.NODE_ENV = 'production';
    expect(isSameOriginRequest(new NextRequest('https://digifeel.example/api/ai/menu', {
      headers: { origin: 'https://digifeel.example' }
    }))).toBe(true);
    expect(isSameOriginRequest(new NextRequest('https://digifeel.example/api/ai/menu', {
      headers: { origin: 'https://attacker.example' }
    }))).toBe(false);
  });

  it('refuse une origine absente en production', () => {
    mutableEnv.APP_ORIGIN = 'https://digifeel.example';
    mutableEnv.NODE_ENV = 'production';
    expect(isSameOriginRequest(new NextRequest('https://digifeel.example/api/billing/checkout'))).toBe(false);
  });
});
