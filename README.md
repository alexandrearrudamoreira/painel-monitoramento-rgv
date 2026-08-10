# 📊 Painel de Monitoramento RGV - Clube do Blindado

**Status:** ✅ **VERSÃO 1.0 - PRONTO PARA DESENVOLVIMENTO**

**Pasta:** `C:\Users\arrud\.openclaw\workspace\clube-do-blindado\modulos\painel-de-monitoramento\`

---

## 🎯 Objetivo

Painel web profissional (estilo Mission Control) para monitorar em tempo real:
- ✅ Status de RGVs (Pendente → Em Andamento → Concluído)
- ✅ Métricas de entrada, processamento e resultado
- ✅ Kanban interativo com 3 colunas
- ✅ Filtro por data
- ✅ Auto-refresh a cada 30 segundos

---

## 🏗️ Arquitetura

```
painel-de-monitoramento/
├── server.js                          ← Express principal
├── package.json                       ← Dependências
├── config.json                        ← Configuração (OAuth, Folder IDs, etc)
│
├── scripts/
│   └── monitor-rgv-board.js          ← Monitor Google Drive (classe RGVBoardMonitor)
│
├── public/
│   ├── index.html                    ← Interface HTML
│   ├── css/
│   │   └── style.css                 ← Design Mission Control
│   └── js/
│       └── app.js                    ← Lógica frontend (classe PainelRGV)
│
└── logs/
    ├── sent-log.json                 ← Rastreamento de envios (compartilhado com WhatsApp)
    └── painel.log                    ← Logs do servidor

```

---

## 🔧 Configuração & Setup

### 1. Instalar dependências

```bash
cd C:\Users\arrud\.openclaw\workspace\clube-do-blindado\modulos\painel-de-monitoramento
npm install
```

### 2. Variáveis de ambiente

Copie as credenciais OAuth de `cadastro-clientes` para `config.json`:
- `client_id` ✅ (ya definido)
- `client_secret` → Usar variável de ambiente `GOOGLE_CLIENT_SECRET`
- `redirect_uri` → `http://localhost:3001/auth/callback` (ou sua URL de produção)

### 3. Rodar localmente

```bash
npm start
# Abre em http://localhost:3001
```

---

## 🎯 Dashboard - 4 Métricas

| Métrica | Origem | Cálculo |
|---------|--------|---------|
| **Entrada** | [2-Processamento] | Pendente + Em Andamento |
| **Processamento** | [2-Processamento] com _1.pdf + _2.pdf | Em Andamento |
| **Resultado** | [3-Relatorio Final] | Concluído |
| **Taxa** | Agregado | (Concluído / Total) × 100% |

---

## 🎯 RGV Board - Kanban (3 Colunas)

### 1️⃣ **Pendente**
- Placas em `[2-Processamento]`
- **Sem** `_1.pdf` ou `_2.pdf`
- Aguardando upload de documentos
- ❌ Não aparece em "Em Andamento" (duplicação evitada)

### 2️⃣ **Em Andamento**
- Placas em `[2-Processamento]`
- **Com** `_1.pdf` AND `_2.pdf`
- Pronto para processamento

### 3️⃣ **Concluído**
- Placas em `[3-Relatorio Final]`
- Badge "✓ Enviado" se placa está em `sent-log.json`
- Indica envio via WhatsApp

---

## 📡 Endpoints API

```javascript
GET /api/metrics?date=2026-08-09
// Retorna:
{
  "entrada": 5,
  "processamento": 2,
  "resultado": 8,
  "percentualConclusao": 62,
  "lastUpdate": "2026-08-09T17:38:54.000Z"
}

GET /api/board?date=2026-08-09
// Retorna:
{
  "pendente": [
    { "placa": "ABC1234", "nome": "ABC1234", "criacao": "...", "status": "pendente" }
  ],
  "em_andamento": [
    { "placa": "XYZ9876", "nome": "XYZ9876", "criacao": "...", "status": "em_andamento" }
  ],
  "concluido": [
    { "placa": "DEF5678", "nome": "DEF5678", "criacao": "...", "status": "concluido", "enviado": true }
  ],
  "totais": { "pendente": 1, "em_andamento": 1, "concluido": 1 },
  "lastUpdate": "2026-08-09T17:38:54.000Z"
}

GET /api/status
// Health check
```

---

## 🎨 Design

- **Tema:** Dark mode com cores Clube do Blindado
- **Paleta:** 
  - Primária: `#C41E3A` (vermelho)
  - Escura: `#1a1a1a`
  - Dourado: `#D4AF37`
- **Tipografia:** Inter, sistema sans-serif
- **Responsivo:** Mobile, tablet, desktop

---

## 🔄 Fluxo de Dados

```
Google Drive
    ↓
[Monitor Google Drive API]
    ↓
[Endpoints API]
    ↓
[Frontend JavaScript - Fetch]
    ↓
[DOM - Renderiza kanban]
    ↓
[Auto-refresh a cada 30s]
```

---

## 📅 Seletor de Data

- **Input:** Data no formato `YYYY-MM-DD`
- **Botão "Hoje":** Volta para data atual
- **Comportamento:** Carrega dados apenas daquela data
- **Padrão:** Data de hoje ao abrir

---

## 🚀 Deploy (Vercel)

```bash
# 1. Push para GitHub
git add .
git commit -m "Módulo painel-de-monitoramento v1.0"
git push origin master

# 2. Vercel deploy (conectado ao GitHub)
vercel deploy --prod
```

**URL Produção:** `https://painel-monitoramento-clube-blindado.vercel.app`

---

## 📝 Roadmap

- [ ] **Fase 1 (v1.0):** ✅ Estrutura básica + API + Frontend
- [ ] **Fase 2:** Autenticação OAuth refinada
- [ ] **Fase 3:** Gráficos (Chart.js) de evolução
- [ ] **Fase 4:** Ações (reenviar RGV, marcar como processado)
- [ ] **Fase 5:** WebSocket para updates em tempo real
- [ ] **Fase 6:** Notificações (desktop, email)
- [ ] **Fase 7:** Integração com modelo de IA para análise

---

## 🐛 Troubleshooting

| Problema | Solução |
|----------|---------|
| Painel não carrega dados | Verifique se token OAuth é válido (`/tmp/painel-oauth-token.json`) |
| Google Drive API erro | Confirme folder IDs corretos em `config.json` |
| CORS error | Configure `cors()` no server.js |
| Data histórica não carrega | Endpoint filtra por `createdTime` — verifique arquivos antigos |

---

## 📚 Documentação Relacionada

- `cadastro-clientes/README.md` — Integração OAuth
- `comunicacao-whatsapp/README.md` — Integração `sent-log.json`
- `TOOLS.md` — Configuração workspace

---

**Versão:** 1.0.0  
**Data:** 2026-08-09  
**Desenvolvedor:** Bob  
**Status:** ✅ Pronto para testes
