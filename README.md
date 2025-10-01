# Monitor GMGN para Telegram

Script simples para monitorar novos tokens no site da GMGN e enviar automaticamente os tokens alvo para o bot do Telegram (@menelaus_trojanbot).

## O que este projeto faz

1. Monitora o site da GMGN em busca de novos tokens
2. Quando um token alvo é encontrado, captura o endereço do contrato
3. Verifica se o token já foi comprado anteriormente para evitar compras duplicadas
4. Envia o endereço do contrato para o bot @menelaus_trojanbot no Telegram
5. Salva o endereço do contrato em um arquivo para evitar compras futuras do mesmo token

## Como Usar

### Método Fácil (Recomendado)

1. Instale o [Node.js](https://nodejs.org/) (versão 14 ou superior)
2. Abra um terminal na pasta do projeto
3. Execute o script de inicialização:
   ```
   node iniciar.js
   ```
4. Na primeira execução, você precisará:
   - Obter suas credenciais do Telegram em https://my.telegram.org/apps
   - Editar o arquivo `telegram-server.js` para adicionar seu API_ID e API_HASH
   - Digitar seu número de telefone no formato internacional (ex: +5511999999999)
   - Digitar o código de verificação que você receberá no Telegram
5. Siga as instruções na tela

### Configurar o Script do Navegador

1. Acesse o site da GMGN: `https://gmgn.ai/new-pair/d6NlGi8K?chain=sol&tab=new_pair`
2. Abra o console do navegador (F12 ou Ctrl+Shift+J)
3. Cole o conteúdo do arquivo `gmgn-monitor.js`
4. Pressione Enter

### Configurar Tokens Alvo

Edite a lista de tokens alvo no início do arquivo `gmgn-monitor.js`:

```javascript
const config = {
    // Lista de tokens alvo (em maiúsculas)
    tokensAlvo: ['ARTIE', 'BONK', 'WEN', 'BOME', 'POPCAT'],
    
    // ... outras configurações
};
```

### Verificação de Tokens Comprados

O sistema mantém um registro de todos os tokens que já foram enviados para compra, evitando compras duplicadas do mesmo token. Você pode:

- Visualizar os tokens já comprados acessando: `http://localhost:3000/purchased-tokens`
- O arquivo `purchased-tokens.json` é criado automaticamente e armazena todos os tokens comprados

## Instruções Detalhadas

Para instruções mais detalhadas, consulte o arquivo [INSTRUCOES.md](INSTRUCOES.md).