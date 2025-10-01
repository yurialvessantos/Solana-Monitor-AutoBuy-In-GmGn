// Liquidity Monitor Service
// Monitora liquidez em Birdeye para contratos pendentes
// Envia alerta via Discord webhook quando liquidez >= valorCompra*2

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const express = require('express');
const cors = require('cors');

// ===== Configuração =====
const PORT = 4000; // porta do serviço
const PENDING_FILE = path.join(__dirname, 'pending-tokens.json');

// Valor de compra em USD (definido via env BUY_USD)
const valorCompraUSD = parseFloat(process.env.BUY_USD);

const LIQ_MULTIPLIER = 2; // regra prática: liq mínima = valorCompra * 2
const LIQ_MIN_USD = valorCompraUSD * LIQ_MULTIPLIER;

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';

// ===== Util =====
function loadPending() {
    try {
        if (fs.existsSync(PENDING_FILE)) {
            return JSON.parse(fs.readFileSync(PENDING_FILE, 'utf8')).tokens || [];
        }
    } catch (err) {
        console.error('Erro ao ler pending-tokens:', err);
    }
    return [];
}

function savePending(list) {
    try {
        fs.writeFileSync(PENDING_FILE, JSON.stringify({ tokens: list }, null, 2));
    } catch (err) {
        console.error('Erro ao salvar pending-tokens:', err);
    }
}

function addPending(ca) {
    const list = loadPending();
    if (!list.includes(ca)) {
        list.push(ca);
        savePending(list);
        console.log(`Novo CA pendente adicionado: ${ca}`);
    }
}

async function fetchLiquidityUSD(ca) {
    try {
        const url = `https://public-api.birdeye.so/public/combined_stat?address=${ca}`;
        const { data } = await axios.get(url, { timeout: 4000 });
        if (data && data.data && typeof data.data.liquidity_usd === 'number') {
            return data.data.liquidity_usd;
        }
    } catch (err) {
        // Silencia erros para não poluir log
    }
    return null;
}

async function notifyDiscord(ca, liqUsd) {
    if (!DISCORD_WEBHOOK_URL) return;
    try {
        await axios.post(DISCORD_WEBHOOK_URL, {
            content: `✅ Token ${ca} atingiu liquidez US$ ${liqUsd.toFixed(2)} (>= ${LIQ_MIN_USD}).`
        });
        console.log('Notificação enviada ao Discord.');
    } catch (err) {
        console.error('Erro ao enviar webhook Discord:', err.message);
    }
}

// Mapa para armazenar último status
const statusMap = new Map();

// ===== Loop Principal =====
async function monitorLoop() {
    const list = loadPending();
    if (list.length === 0) {
        console.clear();
        console.log('Nenhum CA pendente');
        return;
    }
    // Checa liquidez em paralelo
    const results = await Promise.all(list.map(async ca => ({ ca, liq: await fetchLiquidityUSD(ca) })));
    for (const { ca, liq } of results) {
        if (liq != null) {
            statusMap.set(ca, { liq, time: new Date().toLocaleTimeString() });
            if (liq >= LIQ_MIN_USD) {
                await notifyDiscord(ca, liq);
                savePending(loadPending().filter(x => x !== ca));
                statusMap.delete(ca);
            }
        }
    }
    // Exibição de tabela
    console.clear();
    const CA_COL = 44, LIQ_COL = 12, TIME_COL = 8;
    console.log(`${'CA'.padEnd(CA_COL)} | ${'LIQ USD'.padStart(LIQ_COL)} | ${'TIME'.padEnd(TIME_COL)}`);
    console.log('-'.repeat(CA_COL + LIQ_COL + TIME_COL + 6));
    for (const [ca, { liq, time }] of statusMap) {
        console.log(`${ca.padEnd(CA_COL)} | ${liq.toFixed(2).padStart(LIQ_COL)} | ${time.padEnd(TIME_COL)}`);
    }
}

// ===== API =====
const app = express();
app.use(cors());
app.use(express.json());

app.post('/add-pending', (req, res) => {
    const { contractAddress } = req.body || {};
    if (!contractAddress) return res.status(400).json({ success: false, message: 'contractAddress requerido' });
    addPending(contractAddress);
    return res.json({ success: true });
});

app.get('/pending', (req, res) => {
    return res.json({ tokens: loadPending(), count: loadPending().length });
});

// Inicia o servidor e monitoramento apenas se executado diretamente
if (require.main === module) {
    if (isNaN(valorCompraUSD)) {
        console.error('Erro: variável de ambiente BUY_USD não definida ou inválida.');
        process.exit(1);
    }
    // Loop de monitoramento em 500ms
    setInterval(monitorLoop, 500);

    // Inicia servidor
    app.listen(PORT, () => {
        console.log(`Liquidity monitor rodando em http://localhost:${PORT}`);
        console.log(`Liquidez mínima USD: ${LIQ_MIN_USD}`);
    });
}

// Attach functions for testing
app.monitorLoop = monitorLoop;
app.addPending = addPending;
app.loadPending = loadPending;
// Exporta o app para testes
module.exports = app;
