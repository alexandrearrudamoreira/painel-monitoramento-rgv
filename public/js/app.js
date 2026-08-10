/**
 * app.js - Painel RGV (Mission Control Style)
 */

class PainelRGV {
  constructor() {
    this.currentDate = new Date();
    this.init();
  }

  init() {
    console.log('🚀 Painel RGV inicializado');
    this.setupMenu();
    this.setupDatePicker();
    this.setupClock();
    this.loadData();
    this.setupAutoRefresh();
  }

  setupMenu() {
    document.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        this.switchPage(page);
      });
    });
  }

  switchPage(page) {
    // Remove active de todos os botões e páginas
    document.querySelectorAll('[data-page]').forEach(b => b.classList.remove('on'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('on'));

    // Ativa selecionado
    document.querySelector(`[data-page="${page}"]`).classList.add('on');
    document.querySelector('.page.' + page).classList.add('on');

    // Atualiza título
    const titles = { dashboard: 'Dashboard', board: 'RGV Board' };
    document.getElementById('pageTitle').textContent = titles[page];
  }

  setupDatePicker() {
    const input = document.getElementById('datePicker');
    const todayBtn = document.getElementById('todayBtn');

    this.setDatePickerValue(new Date());

    input.addEventListener('change', (e) => {
      console.log('📅 Data alterada para:', e.target.value);
      this.currentDate = new Date(e.target.value);
      this.loadData();
    });

    todayBtn.addEventListener('click', () => {
      console.log('📅 Botão Hoje clicado');
      this.currentDate = new Date();
      this.setDatePickerValue(this.currentDate);
      this.loadData();
    });
  }

  setDatePickerValue(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    document.getElementById('datePicker').value = `${y}-${m}-${d}`;
  }

  setupClock() {
    const updateTime = () => {
      const now = new Date();
      const time = now.toLocaleTimeString('pt-BR', { hour12: false });
      document.getElementById('clock').textContent = time;
    };
    updateTime();
    setInterval(updateTime, 1000);
  }

  setupAutoRefresh() {
    setInterval(() => this.loadData(), 30000);
  }

  async loadData() {
    try {
      const dateStr = this.formatDate(this.currentDate);
      console.log(`🔄 Carregando dados para ${dateStr}`);

      // Carrega métricas
      console.log(`🔍 Fetch: /api/metrics?date=${dateStr}`);
      const metricsRes = await fetch(`/api/metrics?date=${dateStr}`);
      const metrics = await metricsRes.json();
      console.log('📋 Métricas:', metrics);
      
      document.getElementById('entrada').textContent = metrics.entrada || 0;
      document.getElementById('processamento').textContent = metrics.processamento || 0;
      document.getElementById('resultado').textContent = metrics.resultado || 0;
      document.getElementById('taxa').textContent = (metrics.percentualConclusao || 0) + '%';

      // Carrega board
      console.log(`🔍 Fetch: /api/board?date=${dateStr}`);
      const boardRes = await fetch(`/api/board?date=${dateStr}`);
      const board = await boardRes.json();
      console.log('📋 Board:', board);
      
      this.renderBoard(board);

      console.log('✅ Dados carregados com sucesso');
    } catch (err) {
      console.error('❌ Erro ao carregar:', err);
    }
  }

  renderBoard(board) {
    this.renderCol('pendente', board.pendente || []);
    this.renderCol('andamento', board.em_andamento || []);
    this.renderCol('concluido', board.concluido || []);
  }

  renderCol(colName, items) {
    const colId = colName === 'andamento' ? 'andamento' : colName;
    const countId = `count-${colName === 'andamento' ? 'andamento' : colName}`;
    const contentId = `col-${colName === 'andamento' ? 'andamento' : colName}`;

    // Atualiza contador
    const countElem = document.getElementById(countId);
    if (countElem) countElem.textContent = items.length;

    // Renderiza cards
    const content = document.getElementById(contentId);
    if (!content) return;

    if (items.length === 0) {
      content.innerHTML = '<div class="card-empty">Nenhuma placa</div>';
      return;
    }

    content.innerHTML = items.map(item => `
      <div class="rgv-card">
        <div class="card-header">
          <div class="card-placa">${item.placa}</div>
          ${item.enviado ? '<div class="card-badge">✓ Enviado</div>' : ''}
        </div>
        <div class="card-date">${new Date(item.criacao).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</div>
        <div class="card-actions">
          <button class="card-btn">📋 Detalhes</button>
          <button class="card-btn">📤 Reenviar</button>
        </div>
      </div>
    `).join('');
  }

  formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.painel = new PainelRGV();
});
