# Monitor GMGN para Telegram - Instruções

Este script monitora novos tokens no site da GMGN e envia automaticamente os tokens alvo para o bot do Telegram (@menelaus_trojanbot).

## O que este projeto faz

1. Monitora o site da GMGN em busca de novos tokens
2. Quando um token alvo é encontrado, captura o endereço do contrato
3. Verifica se o token já foi comprado anteriormente para evitar compras duplicadas
4. Envia o endereço do contrato para o bot @menelaus_trojanbot no Telegram
5. Salva o endereço do contrato em um arquivo para evitar compras futuras do mesmo token

## Arquivos do Projeto

- `telegram-server.js` - Servidor que se conecta ao Telegram
- `gmgn-monitor.js` - Script para o navegador
- `iniciar.js` - Script para iniciar o servidor facilmente
- `package.json` - Dependências do projeto

## Como Usar

### Método Fácil (Recomendado)

1. Instale o [Node.js](https://nodejs.org/) (versão 14 ou superior)
2. Abra um terminal na pasta do projeto
3. Execute o script de inicialização:
   ```
   node iniciar.js
   ```
4. Siga as instruções na tela

### Método Manual

1. Instale o [Node.js](https://nodejs.org/) (versão 14 ou superior)
2. Abra um terminal na pasta do projeto
4. Instale as dependências:
   ```
   npm install
   ```
5. Inicie o servidor:
   ```
   node telegram-server.js
   ```
6. Antes de executar pela primeira vez:
   - Obtenha suas credenciais do Telegram em https://my.telegram.org/apps
   - Edite o arquivo `telegram-server.js` e substitua:
     ```javascript
     const API_ID = 12345; // Substitua pelo seu API_ID
     const API_HASH = 'abcdef1234567890abcdef1234567890'; // Substitua pelo seu API_HASH
     ```

7. Na primeira execução, você precisará:
   - Digitar seu número de telefone no formato internacional (ex: +5511999999999)
   - Digitar o código de verificação que você receberá no Telegram
   - Digitar sua senha 2FA (se tiver configurado)
7. Mantenha esta janela do terminal aberta

### Configurar o Script do Navegador

1. Acesse o site da GMGN: `https://gmgn.ai/new-pair/d6NlGi8K?chain=sol&tab=new_pair`
2. Abra o console do navegador:
   - Chrome/Edge: Pressione F12 ou Ctrl+Shift+J
   - Firefox: Pressione F12 ou Ctrl+Shift+K
   - Safari: Ative as ferramentas de desenvolvedor em Preferências > Avançado, depois pressione Cmd+Option+C
3. Copie o conteúdo do arquivo `gmgn-monitor.js`
4. Cole no console e pressione Enter

### Configurar Tokens Alvo

Edite a lista de tokens alvo no início do arquivo `gmgn-monitor.js`:

```javascript
const config = {
    // Lista de tokens alvo (em maiúsculas)
    tokensAlvo: ['ARTIE', 'BONK', 'WEN', 'BOME', 'POPCAT'],
    
    // ... outras configurações
};
```


## Como Funciona

1. O servidor local se conecta ao Telegram usando seu número de usuário
2. O script do navegador monitora o site da GMGN em busca de novos tokens
3. Quando um token alvo é encontrado, o script envia os dados para o servidor local
4. O servidor local envia o comando `/start CONTRACT_ADDRESS` para o bot @menelaus_trojanbot
5. A mensagem aparece no Telegram como se tivesse sido enviada por você

## Verificação de Tokens Comprados

O sistema mantém um registro de todos os tokens que já foram enviados para compra, evitando compras duplicadas do mesmo token:

- O arquivo `purchased-tokens.json` é criado automaticamente na primeira execução
- Todos os tokens comprados são registrados neste arquivo com o símbolo, endereço e data/hora
- Você pode visualizar a lista de tokens comprados acessando: `http://localhost:3000/purchased-tokens`
- Se tentar comprar um token que já foi comprado anteriormente, o sistema ignorará automaticamente

## Solução de Problemas

- **Erro "Cannot find module 'telegram'"**: Execute `npm install` na pasta do projeto
- **Erro de autenticação**: Verifique se digitou corretamente o número de telefone e o código de verificação
- **Mensagens não chegam ao bot**: Acesse http://localhost:3000/start-bot-chat para iniciar uma conversa com o bot
- **Tokens não detectados**: Recarregue a página e execute o script novamente