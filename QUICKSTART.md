# 🚀 QUICKSTART - Painel de Monitoramento

## 3 passos para começar

### 1️⃣ Instalar

```bash
cd C:\Users\arrud\.openclaw\workspace\clube-do-blindado\modulos\painel-de-monitoramento
npm install
```

### 2️⃣ Rodar

```bash
npm start
```

### 3️⃣ Acessar

Abra no navegador: **http://localhost:3001**

---

## ✨ O que você verá

### Dashboard
- 4 cards com métricas: Entrada, Processamento, Resultado, Taxa
- Atualização a cada 30 segundos

### RGV Board
- 3 colunas: Pendente | Em Andamento | Concluído
- Clique em uma placa para ver detalhes
- Botões para reenviar RGV

### Seletor de Data
- Escolha qualquer data para ver histórico
- Botão "📅" volta para hoje

---

## 🔧 Configuração Mínima

**config.json** já está preenchido com:
- ✅ Folder IDs do Google Drive
- ✅ Credenciais OAuth (reutilizadas de cadastro-clientes)
- ✅ Porta padrão 3001

Se precisar mudar credenciais, edite `config.json`.

---

## 📊 Dados em Tempo Real

O painel puxa dados diretamente do Google Drive:
- `[2-Processamento]` → Pendente + Em Andamento
- `[3-Relatorio Final]` → Concluído
- `sent-log.json` → Marcação de enviados

**Atualiza automaticamente a cada 30 segundos.**

---

## 🌐 Deploy para Produção

```bash
# Build (se necessário)
# Não precisa - é Node.js puro

# Push para GitHub
git add .
git commit -m "painel-de-monitoramento ready"
git push origin master

# Conecte no Vercel (auto-deploy)
vercel --prod
```

**URL:** `https://painel-monitoramento-clube-blindado.vercel.app`

---

## 📚 Próximos Passos

1. Teste localmente (http://localhost:3001)
2. Verifique se está puxando dados do Google Drive
3. Teste o seletor de data
4. Deploy no Vercel
5. Implemente novas funcionalidades (ações, gráficos, etc)

---

**Dúvidas?** Leia `README.md` para detalhes técnicos.
