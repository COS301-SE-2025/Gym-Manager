import request from 'supertest';

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

const BASE_URL = process.env.API_URL;
if (!BASE_URL) {
  throw new Error('API_URL is not set. Set it in GitHub Actions (Actions → Variables/Secrets) or your local env.');
}

const PATH = process.env.AVAIL_PATH ?? '/health';
const N = Number(process.env.AVAIL_N ?? 60);
const GAP_MS = Number(process.env.AVAIL_GAP_MS ?? 50);
const MAX_P95_MS = Number(process.env.AVAIL_MAX_P95_MS ?? 300);
const MAX_ERR_RATE = Number(process.env.AVAIL_MAX_ERR_RATE ?? 0.0);
const TEST_TIMEOUT_MS = Number(process.env.AVAIL_TIMEOUT_MS ?? 60000);

jest.setTimeout(TEST_TIMEOUT_MS);

function p95(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor(0.95 * (sorted.length - 1));
  return sorted[idx];
}

describe('Availability NFR — remote synthetic probe', () => {
  it(`keeps ${PATH} up for N=${N} probes with p95 ≤ ${MAX_P95_MS}ms and ≤${MAX_ERR_RATE * 100}% failures`, async () => {
    const durations: number[] = [];
    let failures = 0;

    for (let i = 0; i < N; i++) {
      const t0 = Date.now();
      try {
        const res = await request(BASE_URL).get(PATH);
        const dt = Date.now() - t0;
        durations.push(dt);

        const okStatus = res.status === 200;
        const body = res.body ?? {};
        const okBody =
          body?.success === true ||
          String(body?.status ?? '').toLowerCase() === 'ok' ||
          String(body?.status ?? '').toLowerCase() === 'healthy' ||
          okStatus;

        if (!okStatus || !okBody) failures++;
      } catch {
        // Network/DNS/TLS error counts as a failure
        durations.push(Date.now() - t0);
        failures++;
      }

      if (GAP_MS > 0) await sleep(GAP_MS);
    }

    const p95ms = p95(durations);
    const errRate = failures / N;

    console.log(
      `[availability-remote] ${BASE_URL}${PATH} -> N=${N}, p95=${p95ms}ms, max=${Math.max(
        ...durations
      )}ms, failures=${failures}/${N}`
    );

    expect(errRate).toBeLessThanOrEqual(MAX_ERR_RATE);
    expect(p95ms).toBeLessThanOrEqual(MAX_P95_MS);
  });
});
