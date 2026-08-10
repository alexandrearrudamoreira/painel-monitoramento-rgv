/**
 * debug-drive.js
 * 
 * Script para debugar o que existe no Google Drive
 */

const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const CONFIG = require('../config.json');
const localTokenPath = path.join(__dirname, '../.oauth-token.json');

async function debug() {
  try {
    // Carrega token
    if (!fs.existsSync(localTokenPath)) {
      console.error('❌ Token não encontrado em', localTokenPath);
      process.exit(1);
    }

    const tokenData = JSON.parse(fs.readFileSync(localTokenPath, 'utf-8'));
    
    // Autentica
    const oauth2Client = new google.auth.OAuth2(
      CONFIG.oauth.client_id,
      CONFIG.oauth.client_secret,
      CONFIG.oauth.redirect_uri
    );
    oauth2Client.setCredentials(tokenData);

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    console.log('\n🔍 DEBUG: Listando pastas do Google Drive\n');
    console.log('Folder IDs no config.json:');
    console.log('  - Processamento:', CONFIG.googleDrive.folderProcessamento);
    console.log('  - Concluído:', CONFIG.googleDrive.folderConcluido);
    console.log('\n' + '='.repeat(80) + '\n');

    // Lista pasta [2-Processamento]
    console.log('📂 [2-Processamento]:');
    try {
      const res1 = await drive.files.list({
        q: `'${CONFIG.googleDrive.folderProcessamento}' in parents and trashed=false`,
        spaces: 'drive',
        fields: 'files(id, name, mimeType, createdTime)',
        pageSize: 100
      });

      if (res1.data.files.length === 0) {
        console.log('   ❌ Nenhuma pasta/arquivo encontrado!\n');
      } else {
        console.log(`   ✅ ${res1.data.files.length} itens encontrados:\n`);
        res1.data.files.forEach(f => {
          const type = f.mimeType === 'application/vnd.google-apps.folder' ? '📁' : '📄';
          console.log(`   ${type} ${f.name}`);
          console.log(`      ID: ${f.id}`);
          console.log(`      Criação: ${f.createdTime}\n`);
        });
      }
    } catch (err) {
      console.log('   ❌ Erro ao listar:', err.message, '\n');
    }

    console.log('='.repeat(80) + '\n');

    // Lista pasta [3-Relatorio Final]
    console.log('📂 [3-Relatorio Final]:');
    try {
      const res2 = await drive.files.list({
        q: `'${CONFIG.googleDrive.folderConcluido}' in parents and trashed=false`,
        spaces: 'drive',
        fields: 'files(id, name, mimeType, createdTime)',
        pageSize: 100
      });

      if (res2.data.files.length === 0) {
        console.log('   ❌ Nenhuma pasta/arquivo encontrado!\n');
      } else {
        console.log(`   ✅ ${res2.data.files.length} itens encontrados:\n`);
        res2.data.files.forEach(f => {
          const type = f.mimeType === 'application/vnd.google-apps.folder' ? '📁' : '📄';
          console.log(`   ${type} ${f.name}`);
          console.log(`      ID: ${f.id}`);
          console.log(`      Criação: ${f.createdTime}\n`);
        });
      }
    } catch (err) {
      console.log('   ❌ Erro ao listar:', err.message, '\n');
    }

    console.log('='.repeat(80) + '\n');
    console.log('💡 Dica: Se não vir arquivos, pode ser que:');
    console.log('   1. Os Folder IDs em config.json estão errados');
    console.log('   2. A estrutura do Drive é diferente (não tem subpastas)');
    console.log('   3. Permissions do OAuth não incluem drive.readonly\n');

  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
}

debug();
