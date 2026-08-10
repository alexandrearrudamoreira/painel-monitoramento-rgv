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
const TOKEN_FILE_PATH = path.join('/tmp', 'oauth-token.json'); // Compartilhado com cadastro-clientes

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

// Inicia servidor
app.listen(PORT, () => {
  console.log(`🚀 Painel de Monitoramento rodando em http://localhost:${PORT}`);
  console.log('✅ Endpoints: /api/board, /api/metrics, /api/status');
});
