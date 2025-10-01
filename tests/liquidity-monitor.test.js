const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Import the app
const app = require('../liquidity-monitor.js');
const PENDING_FILE = path.join(__dirname, '..', 'pending-tokens.json');

describe('Liquidity Monitor API', () => {
  beforeEach(() => {
    // reset pending tokens file
    fs.writeFileSync(PENDING_FILE, JSON.stringify({ tokens: [] }, null, 2));
  });

  test('GET /pending should return empty list', async () => {
    const res = await request(app).get('/pending');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.tokens)).toBe(true);
    expect(res.body.count).toBe(0);
  });

  test('POST /add-pending should add a CA', async () => {
    const resPost = await request(app)
      .post('/add-pending')
      .send({ contractAddress: 'DummyCA123' });
    expect(resPost.status).toBe(200);
    expect(resPost.body.success).toBe(true);

    const resGet = await request(app).get('/pending');
    expect(resGet.status).toBe(200);
    expect(resGet.body.tokens).toContain('DummyCA123');
    expect(resGet.body.count).toBe(1);
  });

  test('POST /add-pending without contractAddress returns 400', async () => {
    const res = await request(app)
      .post('/add-pending')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
