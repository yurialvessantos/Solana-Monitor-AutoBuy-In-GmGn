// GMGN Monitor - Script Simplificado
// Para usar: copie e cole este script no console do navegador na página https://gmgn.ai/new-pair/d6NlGi8K?chain=sol&tab=new_pair

(function() {
'use strict';

// Configurações (edite conforme necessário)
const config = {
    // Lista de tokens alvo (em maiúsculas)
    tokensAlvo: ['ARTIE', 'BONK', 'WEN', 'BOME', 'POPCAT'],
    
    // Bot do Telegram para envio automático
    botTelegram: '@menelaus_trojanbot',
    
    // Som de notificação (URL do arquivo de áudio)
    somNotificacao: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
    
    // Configurações de monitoramento
    intervaloVerificacao: 2000,  // 2 segundos
    timeoutEspera: 30000         // 30 segundos
};

// Configuração do servidor local
const SERVIDOR_LOCAL = 'http://localhost:3000';

// Variáveis globais
let audio = new Audio(config.somNotificacao);
const tokensProcessados = new Set();

if ('Notification' in window && Notification.permission !== 'granted') {
    Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
    });
}

// Função para verificar se é um token alvo
function isTokenAlvo(simbolo) {
    if (!simbolo) return false;
    
    // Remove o $ se existir e converte para maiúsculo
    const simboloLimpo = simbolo.replace('$', '').toUpperCase();
    
    // Verifica se o símbolo está na lista de alvos
    return config.tokensAlvo.includes(simboloLimpo);
}

// Função para limpar o endereço do contrato
function limparEndereco(url) {
    if (!url) return '';
    
    const match = url.match(/\/sol\/token\/([^?\/]+)/);
    return match ? match[1] : url;
}

// Função para extrair dados do token
function extrairDadosToken(elemento) {
    console.log('Extraindo dados do elemento:', elemento);
    
    let tokenData = {
        simbolo: '',
        contractAddress: '',
        horario: new Date().toLocaleTimeString()
    };
    
    try {
        // Extrai o símbolo do token
        const simboloElement = elemento.querySelector('.css-9enbzl');
        if (simboloElement) {
            tokenData.simbolo = simboloElement.textContent.trim().replace('$', '');
            console.log('Símbolo extraído:', tokenData.simbolo);
        }
        
        // Extrai o endereço do contrato
        const contractElement = elemento.querySelector('a[href*="/sol/token/"]');
        if (contractElement) {
            const href = contractElement.getAttribute('href');
            tokenData.contractAddress = limparEndereco(href);
            console.log('Endereço do contrato extraído:', tokenData.contractAddress);
        }
    } catch (error) {
        console.error('Erro ao extrair dados:', error);
    }
    
    return tokenData;
}

// Função para enviar o token para o Telegram
async function enviarParaTelegram(tokenData) {
    try {
        console.log('Enviando token para o Telegram via servidor local...');
        
        // Envia os dados para o servidor local
        const response = await fetch(`${SERVIDOR_LOCAL}/send-to-bot`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                simbolo: tokenData.simbolo,
                contractAddress: tokenData.contractAddress
            })
        });
        
        // Processa a resposta
        const result = await response.json();
        
        if (result.success) {
            console.log('Token enviado para o Telegram com sucesso:', tokenData.contractAddress);
            return true;
        } else if (result.alreadyPurchased) {
            console.log('Token já foi comprado anteriormente:', tokenData.contractAddress);
            console.log('Ignorando envio para evitar compra duplicada.');
            return true; // Retorna true para não tentar métodos alternativos
        } else {
            console.error('Erro ao enviar para o Telegram:', result.message);
            return false;
        }
    } catch (error) {
        console.error('Erro ao enviar para o servidor local:', error);
        
        // Tenta abrir o Telegram como fallback
        try {
            const botName = config.botTelegram.replace('@', '');
            const telegramUrl = `https://t.me/${botName}?start=${tokenData.contractAddress}`;
            window.open(telegramUrl, '_blank');
            console.log('Aberto link do Telegram como fallback:', telegramUrl);
        } catch (fallbackError) {
            console.error('Erro no método alternativo:', fallbackError);
        }
        
        return false;
    }
}

// Função para processar um token
async function processarToken(elemento) {
    try {
        // Extrai os dados do token
        const tokenData = extrairDadosToken(elemento);
        
        // Verifica se já processamos este token
        if (tokenData.contractAddress && tokensProcessados.has(tokenData.contractAddress)) {
            return;
        }
        
        // Adiciona o token ao conjunto de tokens processados
        if (tokenData.contractAddress) {
            tokensProcessados.add(tokenData.contractAddress);
        }
        
        // Exibe informações sobre o token no console
        console.log('Token detectado:', {
            Símbolo: tokenData.simbolo,
            'Contract Address': tokenData.contractAddress,
            Horário: tokenData.horario
        });
        
        // Verifica se é um token alvo
        if (isTokenAlvo(tokenData.simbolo)) {
            console.log('%cTOKEN ALVO ENCONTRADO!', 'color: green; font-weight: bold; font-size: 16px', tokenData.simbolo);
            
            // Destaca visualmente o token alvo
            elemento.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
            elemento.style.border = '2px solid green';
            
            // Envia notificação desktop
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(`Token Alvo: ${tokenData.simbolo}`, {
                    body: `Contrato: ${tokenData.contractAddress}`
                });
            }
            
            // Toca o som de notificação
            audio.play();
            
            // Envia para o Telegram
            await enviarParaTelegram(tokenData);
        }
    } catch (error) {
        console.error('Erro ao processar token:', error);
    }
}

// Função para monitorar tokens
function monitorarTokens() {
    console.log('Iniciando monitoramento de tokens...');
    
    // Função para encontrar o container de tokens
    function encontrarContainer() {
        // Tenta diferentes seletores possíveis para o site da GMGN
        const seletores = [
            '.g-table-tbody-virtual-holder-inner',
            '.g-table-tbody',
            'div[style*="height"][style*="position: relative"]',
            'div[style*="transform: translateY"]'
        ];

        for (let seletor of seletores) {
            const elemento = document.querySelector(seletor);
            if (elemento) {
                console.log('Container encontrado usando seletor:', seletor);
                return elemento;
            }
        }
        return null;
    }

    // Tenta encontrar o container a cada 2 segundos até encontrar
    const intervalId = setInterval(() => {
        const targetNode = encontrarContainer();
        
        if (targetNode) {
            clearInterval(intervalId);
            console.log('Container encontrado, iniciando observer...');
            
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.addedNodes.length) {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === 1) {
                                // Verifica se o nó é uma linha da tabela
                                if (node.classList && node.classList.contains('g-table-row')) {
                                    console.log('Nova linha de token detectada:', node);
                                    processarToken(node);
                                }
                                
                                // Procura por linhas de tabela dentro do nó
                                const rows = node.querySelectorAll ? node.querySelectorAll('.g-table-row') : [];
                                if (rows.length > 0) {
                                    console.log(`Encontradas ${rows.length} linhas de tokens dentro do nó`);
                                    rows.forEach(row => processarToken(row));
                                }
                            }
                        });
                    }
                });
            });

            const config = { 
                childList: true, 
                subtree: true,
                attributes: false,
                characterData: false
            };
            
            observer.observe(targetNode, config);
            console.log('Observer iniciado com sucesso');
            
            // Processar tokens existentes
            const tokensExistentes = document.querySelectorAll('.g-table-row');
            console.log(`Processando ${tokensExistentes.length} tokens existentes...`);
            
            tokensExistentes.forEach(token => processarToken(token));
        } else {
            console.log('Aguardando container carregar...');
        }
    }, config.intervaloVerificacao);

    // Limpa o intervalo após o tempo limite para evitar loop infinito
    const timeoutId = setTimeout(() => {
        clearInterval(intervalId);
        console.log('Tempo limite de espera atingido. Tentando novamente...');
        // Tenta novamente após o tempo limite
        monitorarTokens();
    }, config.timeoutEspera);
}

// Inicia o monitoramento
console.log('%cIniciando GMGN Monitor...', 'color: blue; font-weight: bold');
monitorarTokens();

// Mensagem de confirmação
console.log('%cGMGN Monitor está rodando! Monitore o console para ver os tokens detectados.', 'color: green; font-weight: bold');
console.log('Tokens alvo configurados:', config.tokensAlvo);

})();