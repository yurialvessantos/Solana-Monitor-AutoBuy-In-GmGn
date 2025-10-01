// Script simples para iniciar o servidor Telegram
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
// Solicitar valor de compra em USD antes de iniciar serviços
const readlineSync = require('readline-sync');
const buyUSD = readlineSync.questionFloat('Quantos USD você pretende comprar por token? ');
process.env.BUY_USD = buyUSD;

console.log('=================================================');
console.log('          INICIANDO SERVIDOR TELEGRAM            ');
console.log('=================================================');
console.log('');


// Inicia o servidor Telegram
console.log('Iniciando servidor Telegram...');

const serverProcess = spawn('node', ['telegram-server.js'], {
    stdio: 'inherit',
    shell: true
});

serverProcess.on('error', (error) => {
    console.error('Erro ao iniciar o servidor:', error.message);
    process.exit(1);
});

// === Novo: Inicia o Liquidity Monitor ===
console.log('Iniciando Liquidity Monitor...');
const liquidityProcess = spawn('node', ['liquidity-monitor.js'], {
    stdio: 'inherit',
    shell: true
});
liquidityProcess.on('error', (error) => {
    console.error('Erro ao iniciar o Liquidity Monitor:', error.message);
    process.exit(1);
});

// Mensagem final
console.log('');
console.log('=================================================');
console.log('  SERVIÇOS INICIADOS: Telegram & Liquidity Monitor  ');
console.log('=================================================');
console.log('Mantenha esta janela aberta enquanto os serviços estiverem rodando.');
console.log('');
console.log('URLs disponíveis:');
console.log('- Telegram status: http://localhost:3000/status');
console.log('- Iniciar chat com o bot: http://localhost:3000/start-bot-chat');
console.log('- Pending tokens (liquidity): http://localhost:4000/pending');
console.log('');
console.log('Para usar o Monitor GMGN:');
console.log('1. Acesse o site da GMGN e abra a aba new-pairs.');
console.log('2. Cole o script gmgn-monitor.js no console do navegador.');
console.log('3. Pressione Enter.');
console.log('');
console.log('Liquidez mínima = valorCompra * 2; alertas via Discord.');