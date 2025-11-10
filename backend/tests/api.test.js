const request = require('supertest');
const app = require('../server');

describe('API health and basic availability', () => {
  test('GET /api/health should return status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(typeof res.body.timestamp).toBe('string');
  });
});
