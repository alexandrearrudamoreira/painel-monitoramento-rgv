/**
 * renovar-token.js
 * 
 * Renova o access_token usando refresh_token
 * Necessário: client_id, client_secret, refresh_token
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const localTokenPath = path.join(__dirname, '../.oauth-token.json');
const credsPath = path.join(__dirname, '../oauth-credentials.json');

async function renovarToken() {
  try {
    console.log('🔄 Renovando access_token...\n');

    // Lê token atual
    if (!fs.existsSync(localTokenPath)) {
      console.error('❌ Token não encontrado em', localTokenPath);
      process.exit(1);
    }

    const tokenData = JSON.parse(fs.readFileSync(localTokenPath, 'utf-8'));

    if (!tokenData.refresh_token) {
      console.error('❌ Nenhum refresh_token encontrado no token.json');
      process.exit(1);
    }

    // Lê credenciais
    if (!fs.existsSync(credsPath)) {
      console.error('❌ oauth-credentials.json não encontrado');
      process.exit(1);
    }

    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'));
    const installed = creds.installed;

    if (!installed.client_id || !installed.client_secret || installed.client_secret === '***') {
      console.error('❌ client_id ou client_secret faltando/placeholder em oauth-credentials.json');
      console.error('   Você precisa copiar as credenciais REAIS do Google Cloud Console');
      process.exit(1);
    }

    // Renova token
    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: installed.client_id,
      client_secret: installed.client_secret,
      refresh_token: tokenData.refresh_token,
      grant_type: 'refresh_token'
    });

    const newTokenData = {
      ...tokenData,
      access_token: response.data.access_token,
      expiry_date: Date.now() + (response.data.expires_in * 1000),
      refresh_token: response.data.refresh_token || tokenData.refresh_token
    };

    // Salva novo token
    fs.writeFileSync(localTokenPath, JSON.stringify(newTokenData, null, 2));

    console.log('✅ Token renovado com sucesso!');
    console.log('   Novo access_token salvo em:', localTokenPath);
    console.log('   Expira em:', new Date(newTokenData.expiry_date).toLocaleString('pt-BR'));
    console.log('\n🚀 Você pode rodar "npm start" agora!\n');

  } catch (err) {
    console.error('❌ Erro ao renovar token:', err.response?.data?.error || err.message);
    process.exit(1);
  }
}

renovarToken();
