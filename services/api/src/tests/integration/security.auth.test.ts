import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../index';

// ---- Config for the tests (purely for CI) ----
const TEST_SECRET = process.env.JWT_SECRET || 'test-secret';

// Try a couple of likely paths (your auth router is mounted at root)
const candidateProtectedPaths = ['/status', '/auth/status', '/me', '/auth/me'];

async function findProtectedPath(): Promise<string> {
  for (const p of candidateProtectedPaths) {
    // Missing token should yield 401 if this path is protected
    const res = await request(app).get(p);
    if (res.status === 401 || res.status === 403) return p;
  }
  throw new Error(
    `Could not find a protected path. Tried: ${candidateProtectedPaths.join(', ')}`
  );
}

describe('Security NFR — auth, CORS, headers', () => {
  let protectedPath: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_SECRET; // ensure JwtService can verify
    protectedPath = await findProtectedPath();
    console.log(`[security] using protected path: ${protectedPath}`);
  });

  // S1 – Authentication enforcement (missing token)
  it('rejects missing token with 401 (FAR = 0%)', async () => {
    const res = await request(app).get(protectedPath);
    expect([401, 403]).toContain(res.status); // 401 preferred; 403 acceptable if your stack does that
  });

  // S2a – JWT integrity: tampered / wrong secret
  it('rejects token with invalid signature (401)', async () => {
    const badToken = jwt.sign({ sub: 123, roles: ['member'] }, 'not-the-right-secret', {
      expiresIn: '5m',
    });
    const res = await request(app)
      .get(protectedPath)
      .set('Authorization', `Bearer ${badToken}`);
    expect([401, 403]).toContain(res.status);
  });

  // S2b – JWT expiry
  it('rejects expired token (401)', async () => {
    // expired 10s ago
    const expiredToken = jwt.sign({ sub: 123, roles: ['member'], exp: Math.floor(Date.now() / 1000) - 10 }, TEST_SECRET);
    const res = await request(app)
      .get(protectedPath)
      .set('Authorization', `Bearer ${expiredToken}`);
    expect([401, 403]).toContain(res.status);
  });

  it('accepts a valid token on a protected endpoint (200)', async () => {
    const goodToken = jwt.sign({ sub: 123, roles: ['member'] }, TEST_SECRET, { expiresIn: '5m' });
    const res = await request(app)
      .get(protectedPath)
      .set('Authorization', `Bearer ${goodToken}`);
    expect(String(res.status).startsWith('2')).toBe(true);
  });

  // S3 – CORS policy: allowed vs disallowed origins
  describe('CORS policy (helmet + cors)', () => {
    const allowedOrigin = 'http://localhost:3000';
    const disallowedOrigin = 'https://evil.example.com';

    it('adds Access-Control-Allow-Origin for allowed origin', async () => {
      const res = await request(app).get('/healthz').set('Origin', allowedOrigin);
      expect(res.headers['access-control-allow-origin']).toBe(allowedOrigin);
    });

    it('does not add Access-Control-Allow-Origin for disallowed origin', async () => {
      const res = await request(app).get('/healthz').set('Origin', disallowedOrigin);
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  // S4 – Security headers present
  it('sets baseline security headers via helmet', async () => {
    const res = await request(app).get('/healthz');
    expect(res.headers['x-content-type-options']).toBeDefined();
    expect(res.headers['x-dns-prefetch-control']).toBeDefined(); 
  });
});
