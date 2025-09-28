import express from 'express';
import helmet from 'helmet';
import cors, { CorsOptions } from 'cors';
import request from 'supertest';

import { AuthMiddleware } from '../../infrastructure/middleware/authMiddleware';
import { JwtService } from '../../infrastructure/auth/jwtService';
import jwt from 'jsonwebtoken';

const allowedOrigins = [
  'http://localhost:3000',
  'https://gym-manager-ashen.vercel.app',
  'https://gym-manager-web.vercel.app',
];

function makeHarness() {
  const app = express();

  app.use(helmet());
  const corsOptions: CorsOptions = {
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      cb(null, allowedOrigins.includes(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200,
  };
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  const auth = new AuthMiddleware();
  app.get('/__protected', auth.isAuthenticated, (req, res) => {
    res.status(200).json({ ok: true, user: (req as any).user });
  });

  app.get('/__public', (_req, res) => res.json({ ok: true }));

  return app;
}

describe('Security NFR — auth, CORS, headers', () => {
  const app = makeHarness();
  const jwtSvc = new JwtService();
  const protectedPath = '/__protected';
  console.log('[security] using protected path:', protectedPath);

  // S1 – AuthN/AuthZ: missing/invalid/expired/valid JWT
  it('rejects missing token with 401 (FAR = 0%)', async () => {
    const res = await request(app).get(protectedPath);
    expect(res.status).toBe(401);
    expect(String(res.body?.error || '')).toMatch(/missing|malformed/i);
  });

  it('rejects token with invalid signature (401)', async () => {
    const bad = jwt.sign({ userId: 1 }, 'wrong-secret', { expiresIn: '10m' });
    const res = await request(app).get(protectedPath).set('Authorization', `Bearer ${bad}`);
    expect(res.status).toBe(401);
  });

  it('rejects expired token (401)', async () => {
    const secret = process.env.JWT_SECRET || 'ci-integration-secret';
    const exp = Math.floor(Date.now() / 1000) - 60; // already expired
    const expired = jwt.sign({ userId: 1, exp }, secret);
    const res = await request(app).get(protectedPath).set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });

  it('accepts a valid token on a protected endpoint (200)', async () => {
    const token = jwtSvc.generateToken({ userId: 123, roles: ['member'] });
    const res = await request(app).get(protectedPath).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
    expect(res.body?.user?.userId).toBe(123);
  });

  // S2 – Baseline security headers (helmet)
  it('sets baseline security headers via helmet', async () => {
    const res = await request(app).get('/__public');
    expect(res.headers).toHaveProperty('x-dns-prefetch-control');
    expect(res.headers).toHaveProperty('x-frame-options');
    expect(res.headers).toHaveProperty('x-content-type-options');
    expect(res.headers).toHaveProperty('x-xss-protection');
    expect(res.headers).toHaveProperty('cross-origin-opener-policy');
  });

  // S3 – CORS policy: allowed vs disallowed origins
  describe('CORS policy (helmet + cors)', () => {
    it('adds Access-Control-Allow-Origin for allowed origin', async () => {
      const res = await request(app).get('/__public').set('Origin', allowedOrigins[0]);
      expect(res.headers['access-control-allow-origin']).toBe(allowedOrigins[0]);
    });

    it('does not add Access-Control-Allow-Origin for disallowed origin', async () => {
      const res = await request(app).get('/__public').set('Origin', 'https://evil.example.com');
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});
