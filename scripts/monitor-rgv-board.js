/**
 * monitor-rgv-board.js
 * 
 * Lógica nova:
 * - Pendente: arquivos _1 e _2 individuais em [2-Processamento]
 * - Em Andamento: pares completos (_1 + _2) em [2-Processamento]
 * - Concluído: subpastas com _RGV_Final.png em [3-Relatorio Final], marcadas se enviadas
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const CONFIG = require('../config.json');
const TOKEN_FILE_PATH = path.join('/tmp', 'oauth-token.json'); // Compartilhado

let oauth2Client = null;
let drive = null;
let globalTokens = null;

// Inicializar Google Drive
async function initGoogleDrive() {
  try {
    let credentials;
    
    if (process.env.OAUTH_CREDENTIALS_JSON) {
      credentials = JSON.parse(process.env.OAUTH_CREDENTIALS_JSON).installed;
      console.log('✅ Credenciais do ambiente');
    } else {
      const oauthFile = path.join(__dirname, '../oauth-credentials.json');
      if (!fs.existsSync(oauthFile)) {
        throw new Error('oauth-credentials.json não encontrado');
      }
      credentials = JSON.parse(fs.readFileSync(oauthFile, 'utf8')).installed;
      console.log('✅ Credenciais do arquivo');
    }
    
    oauth2Client = new google.auth.OAuth2(
      credentials.client_id,
      credentials.client_secret,
      credentials.redirect_uris[0]
    );
    
    drive = google.drive({ version: 'v3', auth: oauth2Client });
    console.log('✅ Google Drive OAuth pronto');
  } catch (err) {
    console.error('❌ Erro ao inicializar Google Drive:', err.message);
  }
}

// Restaurar token
function restaurarToken() {
  try {
    if (fs.existsSync(TOKEN_FILE_PATH)) {
      globalTokens = JSON.parse(fs.readFileSync(TOKEN_FILE_PATH, 'utf8'));
      if (globalTokens && oauth2Client) {
        oauth2Client.setCredentials(globalTokens);
        console.log('🔐 Token restaurado');
      }
      return true;
    }
  } catch (err) {
    console.warn('⚠️ Erro ao restaurar token:', err.message);
  }
  return false;
}

// Renovar token
async function renovarAccessToken() {
  try {
    if (!globalTokens || !globalTokens.refresh_token) {
      console.warn('⚠️ Sem refresh_token');
      return false;
    }
    
    console.log('🔄 Renovando...');
    const { credentials } = await oauth2Client.refreshAccessToken();
    globalTokens = credentials;
    fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify(credentials), 'utf8');
    console.log('💾 Token renovado');
    return true;
  } catch (err) {
    console.error('❌ Erro ao renovar:', err.message);
    return false;
  }
}

// Inicializa na startup
(async () => {
  await initGoogleDrive();
  restaurarToken();
})();

class RGVBoardMonitor {
  constructor() {
    this.drive = drive;
  }

  async garantirTokenValido() {
    if (globalTokens && oauth2Client) {
      const agora = Date.now();
      const margem = 5 * 60 * 1000;
      if (globalTokens.expiry_date && (agora + margem) >= globalTokens.expiry_date) {
        await renovarAccessToken();
      }
    }
  }

  /**
   * Lista arquivos em uma pasta
   */
  async listFiles(folderId, date = null) {
    try {
      await this.garantirTokenValido();
      if (!drive) return [];
      
      let query = `'${folderId}' in parents and trashed=false and mimeType != 'application/vnd.google-apps.folder'`;
      
      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        query += ` and createdTime >= '${startOfDay.toISOString()}' and createdTime <= '${endOfDay.toISOString()}'`;
      }

      const response = await drive.files.list({
        q: query,
        spaces: 'drive',
        fields: 'files(id, name, createdTime, mimeType)',
        pageSize: 1000
      });

      return response.data.files || [];
    } catch (err) {
      console.error('❌ Erro ao listar arquivos:', err.message);
      return [];
    }
  }

  /**
   * Lista subpastas
   */
  async listSubfolders(folderId, date = null) {
    try {
      await this.garantirTokenValido();
      if (!drive) return [];
      
      let query = `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
      
      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        query += ` and createdTime >= '${startOfDay.toISOString()}' and createdTime <= '${endOfDay.toISOString()}'`;
      }

      const response = await drive.files.list({
        q: query,
        spaces: 'drive',
        fields: 'files(id, name, createdTime)',
        pageSize: 1000
      });

      return response.data.files || [];
    } catch (err) {
      console.error('❌ Erro ao listar subpastas:', err.message);
      return [];
    }
  }

  /**
   * Lista arquivos dentro de uma subpasta
   */
  async listFilesInFolder(folderId) {
    try {
      await this.garantirTokenValido();
      if (!drive) return [];

      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        spaces: 'drive',
        fields: 'files(id, name, mimeType)',
        pageSize: 1000
      });

      return response.data.files || [];
    } catch (err) {
      console.error('❌ Erro ao listar arquivos da subpasta:', err.message);
      return [];
    }
  }

  /**
   * Extrai placa do nome
   */
  extractPlaca(name) {
    const match = name.match(/([A-Z0-9]{7})/);
    return match ? match[1] : null;
  }

  /**
   * Obtém status do kanban (NOVA LÓGICA)
   * SEM filtro de data - sempre mostra todos os arquivos
   */
  async getBoard(date = null) {
    try {
      await this.garantirTokenValido();
      // Ignora date parameter - sempre mostra TODOS os arquivos
      const targetDate = null;

      // ════════════════════════════════════════
      // PENDENTE + EM ANDAMENTO: [2-Processamento]
      // ════════════════════════════════════════
      const filesProcessamento = await this.listFiles(CONFIG.googleDrive.folderProcessamento, targetDate);
      
      // Agrupa por placa
      const placas = {};
      filesProcessamento.forEach(f => {
        const placa = this.extractPlaca(f.name);
        if (placa && (f.name.includes('_1') || f.name.includes('_2'))) {
          if (!placas[placa]) {
            placas[placa] = { placa, files: [], criacao: f.createdTime };
          }
          placas[placa].files.push(f.name);
        }
      });

      // Separa PENDENTE vs EM ANDAMENTO
      const pendente = [];
      const em_andamento = [];
      const placasEmAndamento = new Set();

      Object.values(placas).forEach(item => {
        const has1 = item.files.some(f => f.includes(item.placa) && f.includes('_1'));
        const has2 = item.files.some(f => f.includes(item.placa) && f.includes('_2'));

        if (has1 && has2) {
          // EM ANDAMENTO: tem ambos _1 e _2
          em_andamento.push({
            placa: item.placa,
            nome: item.placa,
            criacao: item.criacao,
            status: 'em_andamento'
          });
          placasEmAndamento.add(item.placa);
        } else {
          // PENDENTE: faltam arquivos
          pendente.push({
            placa: item.placa,
            nome: item.placa,
            criacao: item.criacao,
            status: 'pendente'
          });
        }
      });

      // ════════════════════════════════════════
      // CONCLUÍDO: [3-Relatorio Final] com _RGV_Final
      // ════════════════════════════════════════
      const foldersConcluido = await this.listSubfolders(CONFIG.googleDrive.folderConcluido, targetDate);
      const concluido = [];
      const enviados = this.getEnviadosList();

      for (const folder of foldersConcluido) {
        const placa = this.extractPlaca(folder.name) || folder.name;
        
        // Verifica se tem _RGV_Final.png dentro da subpasta
        const filesInFolder = await this.listFilesInFolder(folder.id);
        const hasRGVFinal = filesInFolder.some(f => f.name.includes('_RGV_Final'));

        if (hasRGVFinal) {
          concluido.push({
            placa,
            nome: folder.name,
            criacao: folder.createdTime,
            status: 'concluido',
            enviado: enviados.includes(placa) // Marca se foi enviado
          });
        }
      }

      return {
        pendente,
        em_andamento,
        concluido,
        totais: {
          pendente: pendente.length,
          em_andamento: em_andamento.length,
          concluido: concluido.length
        },
        lastUpdate: new Date().toISOString()
      };
    } catch (err) {
      console.error('❌ Erro ao obter board:', err.message);
      return {
        pendente: [],
        em_andamento: [],
        concluido: [],
        totais: { pendente: 0, em_andamento: 0, concluido: 0 },
        lastUpdate: new Date().toISOString()
      };
    }
  }

  /**
   * Calcula métricas
   */
  async getMetrics(date = null) {
    const board = await this.getBoard(date);
    const total = (board.totais.pendente || 0) + (board.totais.em_andamento || 0) + (board.totais.concluido || 0);

    return {
      entrada: (board.totais.pendente || 0) + (board.totais.em_andamento || 0),
      processamento: board.totais.em_andamento || 0,
      resultado: board.totais.concluido || 0,
      percentualConclusao: total > 0 
        ? Math.round(((board.totais.concluido || 0) / total) * 100)
        : 0,
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * Carrega sent-log do módulo comunicacao-whatsapp
   */
  getEnviadosList() {
    const sentLogPath = path.join(__dirname, '../../../comunicacao-whatsapp/logs/sent-log.json');
    try {
      if (fs.existsSync(sentLogPath)) {
        const sentLog = JSON.parse(fs.readFileSync(sentLogPath, 'utf-8'));
        return sentLog.map(s => s.placa);
      }
    } catch (err) {
      console.warn('⚠️ Não conseguiu ler sent-log:', err.message);
    }
    return [];
  }
}

module.exports = RGVBoardMonitor;
