/**
 * server.js
 * 
 * Servidor Express para Painel de Monitoramento RGV
 * Mesma lógica OAuth do cadastro-clientes
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

try {
  dotenv.config();
} catch (e) {
  console.log('Aviso: arquivo .env não encontrado');
}

const RGVBoardMonitor = require('./scripts/monitor-rgv-board');
const CONFIG = require('./config.json');
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || CONFIG.port;
// Volume persistente Railway: /app/data
// Fallback: /tmp para desenvolvimento local
const DATA_DIR = process.env.NODE_ENV === 'production' ? '/app/data' : '/tmp';
const TOKEN_FILE_PATH = path.join(DATA_DIR, 'oauth-token.json');

// Garante que a pasta existe
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`📁 Pasta criada: ${DATA_DIR}`);
} com cadastro-clientes

console.log('🚀 Iniciando Painel de Monitoramento RGV...');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Global state para tokens
let globalTokens = null;
let oauth2Client = null;
let drive = null;

// MIDDLEWARE: Restaurar e renovar token
app.use(async (req, res, next) => {
  try {
    // Restaura do arquivo se vazio
    if (!globalTokens && fs.existsSync(TOKEN_FILE_PATH)) {
      globalTokens = JSON.parse(fs.readFileSync(TOKEN_FILE_PATH, 'utf8'));
      console.log('🔐 Token restaurado de arquivo');
    }
    
    // Se tem token, configura OAuth2
    if (globalTokens && !oauth2Client) {
      let credentials;
      if (process.env.OAUTH_CREDENTIALS_JSON) {
        credentials = JSON.parse(process.env.OAUTH_CREDENTIALS_JSON).installed;
      } else {
        const oauthFile = path.join(__dirname, 'oauth-credentials.json');
        if (fs.existsSync(oauthFile)) {
          credentials = JSON.parse(fs.readFileSync(oauthFile, 'utf8')).installed;
        }
      }
      
      if (credentials) {
        oauth2Client = new google.auth.OAuth2(
          credentials.client_id,
          credentials.client_secret,
          credentials.redirect_uris[0]
        );
      }
    }
    
    // Verifica e renova token se expirado
    if (globalTokens && oauth2Client) {
      const agora = Date.now();
      const margem = 5 * 60 * 1000; // 5 min
      
      if (globalTokens.expiry_date && (agora + margem) >= globalTokens.expiry_date) {
        console.log('🔄 Token expirado, renovando...');
        try {
          const { credentials } = await oauth2Client.refreshAccessToken();
          globalTokens = credentials;
          fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify(credentials), 'utf8');
          console.log('💾 Token renovado e salvo');
        } catch (err) {
          console.error('❌ Erro ao renovar:', err.message);
          globalTokens = null;
        }
      }
      
      // Redefine credentials
      if (globalTokens) {
        oauth2Client.setCredentials(globalTokens);
        drive = google.drive({ version: 'v3', auth: oauth2Client });
      }
    }
    
    next();
  } catch (err) {
    console.error('⚠️ Erro no middleware:', err.message);
    next();
  }
});

// Instância do monitor
const monitor = new RGVBoardMonitor();

/**
 * GET /api/board
 * Retorna status do kanban RGV Board
 */
app.get('/api/board', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();

    const board = await monitor.getBoard(targetDate);

    // Marca como enviado se estiver no sent-log.json
    const enviados = monitor.getEnviadosList();
    board.concluido = board.concluido.map(item => ({
      ...item,
      enviado: enviados.includes(item.placa)
    }));

    res.json(board);
  } catch (err) {
    console.error('❌ Erro ao obter board:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/metrics
 * Retorna métricas do sistema
 */
app.get('/api/metrics', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();

    const metrics = await monitor.getMetrics(targetDate);
    res.json(metrics);
  } catch (err) {
    console.error('❌ Erro ao obter métricas:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/status
 * Status do servidor
 */
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/**
 * GET / (raiz)
 * Serve index.html
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * GET /auth
 * Inicia autenticação OAuth com Google
 */
app.get('/auth', (req, res) => {
  try {
    let credentials;
    
    if (process.env.OAUTH_CREDENTIALS_JSON) {
      credentials = JSON.parse(process.env.OAUTH_CREDENTIALS_JSON).installed;
    } else {
      const oauthFile = path.join(__dirname, 'oauth-credentials.json');
      if (!fs.existsSync(oauthFile)) {
        throw new Error('oauth-credentials.json não encontrado');
      }
      credentials = JSON.parse(fs.readFileSync(oauthFile, 'utf8')).installed;
    }
    
    oauth2Client = new google.auth.OAuth2(
      credentials.client_id,
      credentials.client_secret,
      credentials.redirect_uris[0]
    );
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/drive'],
      prompt: 'consent'
    });
    
    console.log('🔐 Redirecionando para autenticação Google...');
    res.redirect(authUrl);
  } catch (err) {
    console.error('❌ Erro ao iniciar autenticação:', err.message);
    res.status(500).send('Erro ao iniciar autenticação: ' + err.message);
  }
});

/**
 * GET /auth/callback
 * Callback da autenticação OAuth
 */
app.get('/auth/callback', async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) throw new Error('Código de autorização não recebido');
    
    if (!oauth2Client) {
      throw new Error('OAuth2Client não inicializado');
    }
    
    const { tokens } = await oauth2Client.getToken(code);
    globalTokens = tokens;
    oauth2Client.setCredentials(tokens);
    
    // Salva em arquivo
    try {
      fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify(tokens), 'utf8');
      console.log('💾 Token OAuth salvo');
    } catch (err) {
      console.warn('⚠️ Erro ao salvar token:', err.message);
    }
    
    // Redefine drive
    drive = google.drive({ version: 'v3', auth: oauth2Client });
    
    console.log('✅ Autenticação bem-sucedida!');
    res.send(`
      ✅ Autenticação bem-sucedida!<br>
      Token salvo em memória e arquivo.<br>
      <a href="/">Voltar para o painel</a>
    `);
  } catch (err) {
    console.error('❌ Erro no callback:', err.message);
    res.status(500).send('Erro na autenticação: ' + err.message);
  }
});

/**
 * GET /logout
 * Deletar token
 */
app.get('/logout', (req, res) => {
  try {
    if (fs.existsSync(TOKEN_FILE_PATH)) {
      fs.unlinkSync(TOKEN_FILE_PATH);
      console.log('🔓 Token deletado');
    }
    globalTokens = null;
    res.send('✅ Logout realizado! <a href="/">Voltar</a>');
  } catch (err) {
    console.error('❌ Erro ao fazer logout:', err.message);
    res.status(500).send('Erro ao fazer logout: ' + err.message);
  }
});

// Inicia servidor
app.listen(PORT, () => {
  console.log(`🚀 Painel de Monitoramento rodando em http://localhost:${PORT}`);
  console.log('✅ Endpoints: /api/board, /api/metrics, /api/status');
});
