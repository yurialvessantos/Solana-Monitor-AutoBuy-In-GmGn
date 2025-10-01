const fs = require('fs');
const path = require('path');
const axios = require('axios');
jest.mock('axios');

describe('monitorLoop logic', () => {
  let monitorLoop;
  let addPending;
  const PENDING_FILE = path.join(__dirname, '..', 'pending-tokens.json');

  beforeEach(() => {
    jest.resetModules();
    process.env.BUY_USD = '2';
    process.env.DISCORD_WEBHOOK_URL = 'http://discord.test';
    // reset pending file
    fs.writeFileSync(PENDING_FILE, JSON.stringify({ tokens: [] }, null, 2));
    const app = require('../liquidity-monitor.js');
    monitorLoop = app.monitorLoop;
    addPending = app.addPending;
  });

  test('does not remove CA below threshold', async () => {
    addPending('ABC');
    axios.get.mockResolvedValue({ data: { data: { liquidity_usd: 1 } } });
    axios.post.mockResolvedValue({});
    await monitorLoop();
    const content = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));
    expect(content.tokens).toContain('ABC');
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('removes CA and sends Discord above threshold', async () => {
    addPending('XYZ');
    axios.get.mockResolvedValue({ data: { data: { liquidity_usd: 5 } } });
    axios.post.mockResolvedValue({});
    await monitorLoop();
    const content = JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8'));
    expect(content.tokens).not.toContain('XYZ');
    expect(axios.post).toHaveBeenCalledWith(
      process.env.DISCORD_WEBHOOK_URL,
      expect.objectContaining({ content: expect.any(String) })
    );
  });
});
