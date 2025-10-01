// jest test for telegram-server routes
const request = require('supertest');
const fs = require('fs');
const path = require('path');

// Ensure correct env
process.env.LIQ_MONITOR_URL = 'http://localhost:4000/add-pending';

// Import app
const { app } = require('../telegram-server.js');
const PURCHASED_FILE = path.join(__dirname, '..', 'purchased-tokens.json');

describe('Telegram Server API', () => {
  beforeEach(() => {
    // reset purchased tokens file
    fs.writeFileSync(PURCHASED_FILE, JSON.stringify({ tokens: [] }, null, 2));
  });

  test('GET /status should return connected false initially', async () => {
    const res = await request(app).get('/status');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.connected).toBe(false);
  });

  test('GET /purchased-tokens should return empty array', async () => {
    const res = await request(app).get('/purchased-tokens');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.tokens)).toBe(true);
    expect(res.body.count).toBe(0);
  });

  test('POST /send-to-bot without payload returns 400', async () => {
    const res = await request(app)
      .post('/send-to-bot')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
