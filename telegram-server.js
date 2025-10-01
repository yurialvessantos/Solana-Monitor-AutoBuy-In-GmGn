// Servidor local simplificado para enviar mensagens ao Telegram usando o número do usuário
const { StringSession } = require('telegram/sessions');
const { TelegramClient, Api } = require('telegram');
const { NewMessage } = require('telegram/events');
const EditedMessage = require('telegram/events/EditedMessage').EditedMessage;
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const axios = require('axios');

// Configurações do Telegram
// Substitua com suas próprias credenciais do Telegram
// Obtenha em https://my.telegram.org/apps
const API_ID = 20369865;
const API_HASH = 'd9a780bf241cc20a6cfdb71f4c8dca3b';
const BOT_USERNAME = 'menelaus_trojanbot'; // Nome de usuário do bot (sem @)
const SESSION_FILE = path.join(__dirname, 'telegram-session.txt'); // Arquivo para salvar a sessão
const PURCHASED_TOKENS_FILE = path.join(__dirname, 'purchased-tokens.json'); // Arquivo para salvar tokens comprados

// Configurações do servidor
const PORT = 3000;
const app = express();

// Configurações adicionais
const LIQ_MONITOR_URL = process.env.LIQ_MONITOR_URL || 'http://localhost:4000/add-pending';
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// Middleware para permitir CORS e JSON
app.use(cors());
app.use(express.json());

// Variável para armazenar o cliente Telegram
let client = null;
let BOT_ENTITY = null;
let BOT_ID = null;

// Mapa de CAs enviados para await resposta do bot
const pendingSentCAs = new Set();

// Função para ler input do usuário no console
function getUserInput(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve(answer);
        });
    });
}

// Função para carregar a sessão salva
function loadSession() {
    try {
        return fs.existsSync(SESSION_FILE) ? fs.readFileSync(SESSION_FILE, 'utf8') : '';
    } catch (err) {
        console.error('Erro ao carregar sessão:', err);
        return '';
    }
}

// Função para salvar a sessão
function saveSession(session) {
    try {
        fs.writeFileSync(SESSION_FILE, session);
        console.log('Sessão salva com sucesso!');
    } catch (err) {
        console.error('Erro ao salvar sessão:', err);
    }
}

// Função para carregar os tokens já comprados
function loadPurchasedTokens() {
    try {
        if (fs.existsSync(PURCHASED_TOKENS_FILE)) {
            const data = fs.readFileSync(PURCHASED_TOKENS_FILE, 'utf8');
            return JSON.parse(data);
        } else {
            // Se o arquivo não existir, cria um novo
            const initialData = { tokens: [] };
            fs.writeFileSync(PURCHASED_TOKENS_FILE, JSON.stringify(initialData, null, 2));
            return initialData;
        }
    } catch (err) {
        console.error('Erro ao carregar tokens comprados:', err);
        return { tokens: [] };
    }
}

// Função para salvar um novo token comprado
function savePurchasedToken(tokenData) {
    try {
        const purchasedTokens = loadPurchasedTokens();
        
        // Verifica se o token já está na lista
        const tokenExists = purchasedTokens.tokens.some(token =>
            token.contractAddress === tokenData.contractAddress
        );
        
        // Se o token não existir, adiciona à lista
        if (!tokenExists) {
            purchasedTokens.tokens.push({
                simbolo: tokenData.simbolo,
                contractAddress: tokenData.contractAddress,
                timestamp: new Date().toISOString()
            });
            
            // Salva a lista atualizada
            fs.writeFileSync(
                PURCHASED_TOKENS_FILE,
                JSON.stringify(purchasedTokens, null, 2)
            );
            
            console.log(`Token ${tokenData.simbolo} (${tokenData.contractAddress}) adicionado à lista de comprados`);
            return true;
        } else {
            console.log(`Token ${tokenData.simbolo} (${tokenData.contractAddress}) já está na lista de comprados`);
            return false;
        }
    } catch (err) {
        console.error('Erro ao salvar token comprado:', err);
        return false;
    }
}

// Função para verificar se um token já foi comprado
function isTokenPurchased(contractAddress) {
    try {
        const purchasedTokens = loadPurchasedTokens();
        return purchasedTokens.tokens.some(token => token.contractAddress === contractAddress);
    } catch (err) {
        console.error('Erro ao verificar se token foi comprado:', err);
        return false;
    }
}

// Função para iniciar o cliente Telegram
async function initTelegramClient() {
    try {
        // Carrega a sessão salva
        const savedSession = loadSession();
        const stringSession = new StringSession(savedSession);

        // Cria o cliente Telegram
        client = new TelegramClient(stringSession, API_ID, API_HASH, {
            connectionRetries: 5,
        });

        // Inicia o cliente
        await client.start({
            phoneNumber: async () => {
                // Solicita o número de telefone se não houver sessão salva
                const phoneNumber = await getUserInput('Digite seu número de telefone (formato internacional, ex: +5511999999999): ');
                return phoneNumber;
            },
            password: async () => {
                // Solicita a senha 2FA se necessário
                const password = await getUserInput('Digite sua senha 2FA (se tiver): ');
                return password;
            },
            phoneCode: async () => {
                // Solicita o código de verificação enviado por SMS/Telegram
                const code = await getUserInput('Digite o código de verificação recebido: ');
                return code;
            },
            onError: err => console.log('Erro durante login:', err),
        });

        // Salva a sessão para uso futuro
        const sessionString = client.session.save();
        saveSession(sessionString);
        
        console.log('Login no Telegram realizado com sucesso!');
        const me = await client.getMe();
        console.log(`Conectado como: ${me.username || me.phone || 'Usuário sem username'}`);
        
        // Tenta encontrar o bot para verificar se está acessível
        try {
            const entity = await client.getEntity(`@${BOT_USERNAME}`);
            // Bot encontrado
            BOT_ENTITY = entity;
            BOT_ID = Number(entity.id.value);
            
            // Tenta iniciar uma conversa com o bot automaticamente
            try {
                console.log(`Iniciando conversa automática com @${BOT_USERNAME}...`);
                await client.sendMessage(entity, { message: '/start' });
                console.log('Mensagem inicial enviada para o bot com sucesso!');
            } catch (startErr) {
                console.warn(`Não foi possível enviar mensagem inicial para o bot:`, startErr.message);
            }
        } catch (err) {
            console.warn(`Aviso: Não foi possível encontrar o bot @${BOT_USERNAME}. Erro:`, err.message);
            console.log('Isso pode causar problemas ao enviar mensagens. Tente iniciar uma conversa manualmente com o bot primeiro.');
        }
        
        // Registra o listener após logar
        registerBotListener();
        
        return true;
    } catch (err) {
        console.error('Erro ao iniciar cliente Telegram:', err);
        return false;
    }
}

// Listener para mensagens do bot e repasse de falhas
const ERROR_KEYWORDS = [
    'failed to fetch',
    'insufficient',
    'no liquidity',
    'failed',
    'error'
];

function registerBotListener() {
    if (!client) return;
    console.log('Registrando listener para @' + BOT_USERNAME + '...');

    const successPattern = /🟢\s*buy success!/i;
    const errorPattern = /🔴|failed to fetch|insufficient|no liquidity/i;

    // 2) Handler para sucesso em nova mensagem
    client.addEventHandler(ev => processStatus(ev.message.message), new NewMessage({ fromUsers: [BOT_ID], incoming: true, pattern: successPattern }));
    // 3) Handler para sucesso em edição de mensagem
    client.addEventHandler(ev => processStatus(ev.message.message), new EditedMessage({ fromUsers: [BOT_ID], incoming: true, pattern: successPattern }));

    // 4) Handler para erro em nova mensagem
    client.addEventHandler(ev => processStatus(ev.message.message), new NewMessage({ fromUsers: [BOT_ID], incoming: true, pattern: errorPattern }));
    // 5) Handler para erro em edição de mensagem
    client.addEventHandler(ev => processStatus(ev.message.message), new EditedMessage({ fromUsers: [BOT_ID], incoming: true, pattern: errorPattern }));

    console.log('Listener de mensagens do bot registrado.');
}

// Função auxiliar para tratar status de sucesso/erro
function processStatus(text) {
    if (pendingSentCAs.size === 0) return;
    if (/🟢\s*buy success!/i.test(text)) {
        pendingSentCAs.forEach(ca => {
            savePurchasedToken({ simbolo: null, contractAddress: ca, timestamp: new Date().toISOString() });
            console.log(`✅ ${ca}`);
        });
    } else {
        pendingSentCAs.forEach(async ca => {
            console.log(`❌ ${ca}`);
            try {
                await axios.post(LIQ_MONITOR_URL, { contractAddress: ca });
            } catch (err) {
                console.error(`❌ Monitor error ${ca}:`, err.message);
            }
        });
    }
    pendingSentCAs.clear();
}

// Rota para iniciar manualmente uma conversa com o bot
app.get('/start-bot-chat', async (req, res) => {
    try {
        if (!client) {
            return res.status(500).json({ 
                success: false, 
                message: 'Cliente Telegram não está conectado' 
            });
        }
        
        console.log(`Iniciando conversa com o bot @${BOT_USERNAME}...`);
        
        try {
            // Tenta obter a entidade do bot
            const entity = await client.getEntity(`@${BOT_USERNAME}`);
            // Bot encontrado
            // Envia uma mensagem inicial
            await client.sendMessage(entity, {
                message: `/start`
            });
            
            console.log('Mensagem inicial enviada para o bot');
            
            return res.status(200).json({ 
                success: true, 
                message: `Conversa iniciada com @${BOT_USERNAME}. Verifique seu Telegram.` 
            });
        } catch (err) {
            console.error('Erro ao iniciar conversa com o bot:', err);
            return res.status(500).json({ 
                success: false, 
                message: `Erro ao iniciar conversa: ${err.message}` 
            });
        }
    } catch (err) {
        console.error('Erro na rota start-bot-chat:', err);
        return res.status(500).json({ 
            success: false, 
            message: `Erro interno: ${err.message}` 
        });
    }
});

// Rota para enviar mensagem para o bot
app.post('/send-to-bot', async (req, res) => {
    try {
        const { simbolo, contractAddress } = req.body;
        // valida payload primeiro
        if (!simbolo || !contractAddress) {
            return res.status(400).json({
                success: false,
                message: 'Dados incompletos. Envie simbolo e contractAddress'
            });
        }
        // client precisa estar conectado
        if (!client) {
            return res.status(500).json({
                success: false,
                message: 'Cliente Telegram não está conectado'
            });
        }
        
        // Enviando for confirmação
        // Verifica se o token já foi comprado
        if (isTokenPurchased(contractAddress)) {
            console.log(`Token ${simbolo} (${contractAddress}) já foi comprado anteriormente. Ignorando.`);
            return res.status(200).json({
                success: false,
                message: `Token ${simbolo} já foi comprado anteriormente.`,
                alreadyPurchased: true
            });
        }
        
        try {
            // Tenta obter a entidade do bot
            const entity = await client.getEntity(`@${BOT_USERNAME}`);
            // Bot confirmado
            await client.sendMessage(entity, { message: `${contractAddress}` });
            console.log(`Enviado: ${contractAddress}`);
            // Marca CA como pendente de confirmação de sucesso/erro
            pendingSentCAs.add(contractAddress);
            return res.status(200).json({
                success: true,
                message: `Token ${simbolo} enviado para @${BOT_USERNAME}. Aguardando confirmação...`
            });
        } catch (err) {
            console.error('Erro ao enviar mensagem para o bot:', err);
            
            // Tenta métodos alternativos
            try {
                // Método alternativo: usar o username diretamente
                await client.sendMessage(BOT_USERNAME, {
                    message: `${contractAddress}`
                });
                
                console.log('Mensagem enviada com sucesso (método alternativo)!');
                
                // Salva o token como comprado
                savePurchasedToken({ simbolo, contractAddress });
                
                return res.status(200).json({
                    success: true,
                    message: `Token ${simbolo} enviado para @${BOT_USERNAME} com sucesso!`
                });
            } catch (err2) {
                console.error('Erro no método alternativo:', err2);
                
                return res.status(500).json({ 
                    success: false, 
                    message: `Erro ao enviar mensagem: ${err.message}` 
                });
            }
        }
    } catch (err) {
        console.error('Erro na rota send-to-bot:', err);
        return res.status(500).json({ 
            success: false, 
            message: `Erro interno: ${err.message}` 
        });
    }
});

// Rota para verificar o status do servidor
app.get('/status', async (req, res) => {
    try {
        const connected = client !== null;
        let botStatus = 'não verificado';
        
        if (connected) {
            try {
                const entity = await client.getEntity(`@${BOT_USERNAME}`);
                botStatus = 'encontrado';
            } catch (err) {
                botStatus = 'não acessível';
            }
        }
        
        return res.status(200).json({ 
            success: true, 
            connected, 
            botStatus,
            message: connected ? 'Servidor conectado ao Telegram' : 'Servidor não conectado ao Telegram'
        });
    } catch (err) {
        console.error('Erro na rota status:', err);
        return res.status(500).json({ 
            success: false, 
            message: `Erro interno: ${err.message}` 
        });
    }
});

// Rota para listar tokens comprados
app.get('/purchased-tokens', (req, res) => {
    try {
        const purchasedTokens = loadPurchasedTokens();
        
        return res.status(200).json({
            success: true,
            tokens: purchasedTokens.tokens,
            count: purchasedTokens.tokens.length
        });
    } catch (err) {
        console.error('Erro na rota purchased-tokens:', err);
        return res.status(500).json({
            success: false,
            message: `Erro interno: ${err.message}`
        });
    }
});

// Inicia o servidor
async function startServer() {
    // Inicia o cliente Telegram
    const connected = await initTelegramClient();
    
    if (!connected) {
        console.error('Não foi possível conectar ao Telegram. Verifique suas credenciais.');
        process.exit(1);
    }
    
    // Inicia o servidor Express
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
        console.log('Pronto para receber solicitações do script GMGN Monitor!');
        console.log('Mantenha esta janela aberta enquanto estiver usando o monitor.');
        console.log('\nURLs disponíveis:');
        console.log('- Status do servidor: http://localhost:3000/status');
        console.log('- Iniciar conversa com o bot: http://localhost:3000/start-bot-chat');
        console.log('- Listar tokens comprados: http://localhost:3000/purchased-tokens');
    });
}

// Apenas executa o startServer se este arquivo for chamado diretamente
if (require.main === module) {
    startServer().catch(err => {
        console.error('Erro ao iniciar o servidor:', err);
        process.exit(1);
    });
}

// Exporta o app para testes
module.exports = { app, initTelegramClient };