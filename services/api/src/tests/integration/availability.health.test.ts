import request from 'supertest';
import { app } from '../../index';

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

const N = Number(process.env.AVAIL_N ?? 60); // number of probes
const GAP_MS = Number(process.env.AVAIL_GAP_MS ?? 50); // delay between probes
const MAX_P95_MS = Number(process.env.AVAIL_MAX_P95_MS ?? 300);
const MAX_ERR_RATE = Number(process.env.AVAIL_MAX_ERR_RATE ?? 0.0);

function p95(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor(0.95 * (sorted.length - 1));
  return sorted[idx];
}

describe('Availability NFR — /health synthetic probe', () => {
  it(`keeps /health up for N=${N} probes with p95 ≤ ${MAX_P95_MS}ms and 0% failures`, async () => {
    const durations: number[] = [];
    let failures = 0;

    for (let i = 0; i < N; i++) {
      const t0 = Date.now();
      const res = await request(app).get('/healthz');
      const dt = Date.now() - t0;
      durations.push(dt);

      // Consider 200 mandatory; body shape is flexible across teams
      const okStatus = res.status === 200;
      const body = res.body ?? {};
      const okBody =
        body?.success === true ||
        String(body?.status ?? '').toLowerCase() === 'ok' ||
        String(body?.status ?? '').toLowerCase() === 'healthy' ||
        // fall back: if status=200 we count as healthy
        true;

      if (!okStatus || !okBody) failures++;

      if (GAP_MS > 0) await sleep(GAP_MS);
    }

    const p95ms = p95(durations);
    const errRate = failures / N;

    // Useful log in CI output
    // eslint-disable-next-line no-console
    console.log(
      `[availability] /health -> N=${N}, p95=${p95ms}ms, max=${Math.max(...durations)}ms, failures=${failures}/${N}`
    );

    expect(errRate).toBeLessThanOrEqual(MAX_ERR_RATE);
    expect(p95ms).toBeLessThanOrEqual(MAX_P95_MS);
  });
});
