/**
 * gerar-token.js
 * 
 * Script para gerar token OAuth interativamente
 * Use quando o painel pedir autenticação
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');
const { google } = require('googleapis');

const CONFIG = require('../config.json');
const CREDENTIALS_PATH = path.join(__dirname, '../oauth-credentials.json');
const TOKEN_PATH = CONFIG.oauth.token_path;

async function getAccessToken() {
  const credentialsPath = CREDENTIALS_PATH;

  if (!fs.existsSync(credentialsPath)) {
    console.error('❌ Arquivo oauth-credentials.json não encontrado!');
    console.error('Copie de: C:\\Users\\arrud\\.openclaw\\workspace\\clube-do-blindado\\modulos\\cadastro-clientes\\oauth-credentials.json');
    process.exit(1);
  }

  const creds = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
  const installed = creds.installed;

  const oauth2Client = new google.auth.OAuth2(
    installed.client_id,
    installed.client_secret,
    installed.redirect_uris[1] || installed.redirect_uris[0]
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive'
    ],
    prompt: 'consent'
  });

  console.log('\n🔐 Abra este link no navegador para autorizar:\n');
  console.log(authUrl);
  console.log('\nAguardando callback...\n');

  // Simula callback local
  const server = http.createServer(async (req, res) => {
    const queryUrl = url.parse(req.url, true);

    if (queryUrl.pathname === '/oauth/callback') {
      const code = queryUrl.query.code;

      if (code) {
        try {
          const { tokens } = await oauth2Client.getToken(code);
          oauth2Client.setCredentials(tokens);

          // Salva token
          fs.mkdirSync(path.dirname(TOKEN_PATH), { recursive: true });
          fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('✅ Token salvo com sucesso! Você pode fechar esta página. Volte ao terminal.');

          console.log('✅ Token salvo em:', TOKEN_PATH);
          console.log('✅ Você pode rodar "npm start" agora!\n');

          server.close();
          process.exit(0);
        } catch (err) {
          console.error('❌ Erro ao trocar código por token:', err.message);
          res.writeHead(400);
          res.end('Erro ao autenticar');
          server.close();
          process.exit(1);
        }
      }
    }
  });

  server.listen(3002, () => {
    console.log('📡 Servidor de callback aguardando em http://localhost:3002/oauth/callback\n');
  });

  server.on('error', (err) => {
    console.error('❌ Erro no servidor:', err.message);
    process.exit(1);
  });
}

getAccessToken().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
