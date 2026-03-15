// ==================== UTILIDAD DE PAGINACIÓN ====================

class Paginator {
  constructor(tbodyId, pageSize = 20) {
    this.tbodyId = tbodyId;
    this.pageSize = pageSize;
    this.currentPage = 1;
    this._rows = [];
    this._emptyHtml = '';
    this._controlsEl = null;
    window[`__pg_${tbodyId}`] = this;
  }

  get tbody() { return document.getElementById(this.tbodyId); }
  get totalPages() { return Math.max(1, Math.ceil(this._rows.length / this.pageSize)); }

  render(htmlRows, emptyHtml = '') {
    this._rows = htmlRows;
    this._emptyHtml = emptyHtml;
    this.currentPage = 1;
    this._paint();
    this._syncControls();
  }

  goTo(page) {
    this.currentPage = Math.min(this.totalPages, Math.max(1, page));
    this._paint();
    this._syncControls();
  }

  _paint() {
    const tbody = this.tbody;
    if (!tbody) return;
    if (this._rows.length === 0) {
      tbody.innerHTML = this._emptyHtml;
      return;
    }
    const start = (this.currentPage - 1) * this.pageSize;
    tbody.innerHTML = this._rows.slice(start, start + this.pageSize).join('');
  }

  _ensureControls() {
    if (this._controlsEl && this._controlsEl.isConnected) return this._controlsEl;
    const tbody = this.tbody;
    if (!tbody) return null;
    const table = tbody.closest('table');
    if (!table) return null;
    const wrap = table.closest('.tabla-scroll-horizontal') || table.parentElement;
    let el = document.querySelector(`.paginator-wrap[data-pg="${this.tbodyId}"]`);
    if (!el) {
      el = document.createElement('div');
      el.className = 'paginator-wrap';
      el.dataset.pg = this.tbodyId;
      wrap.insertAdjacentElement('afterend', el);
    }
    this._controlsEl = el;
    return el;
  }

  _syncControls() {
    const el = this._ensureControls();
    if (!el) return;
    if (this._rows.length <= this.pageSize) {
      el.innerHTML = '';
      return;
    }
    const total = this.totalPages;
    const cur = this.currentPage;
    const id = this.tbodyId;
    const from = (cur - 1) * this.pageSize + 1;
    const to = Math.min(cur * this.pageSize, this._rows.length);
    const pages = this._buildPages(cur, total);
    el.innerHTML = `
      <div class="paginator">
        <span class="paginator-info">${from}–${to} de ${this._rows.length}</span>
        <button class="paginator-btn" onclick="window.__pg_${id}.goTo(${cur - 1})" ${cur === 1 ? 'disabled' : ''}>&#8249;</button>
        ${pages.map(p =>
          p === '…'
            ? `<span class="paginator-ellipsis">…</span>`
            : `<button class="paginator-btn${p === cur ? ' active' : ''}" onclick="window.__pg_${id}.goTo(${p})">${p}</button>`
        ).join('')}
        <button class="paginator-btn" onclick="window.__pg_${id}.goTo(${cur + 1})" ${cur === total ? 'disabled' : ''}>&#8250;</button>
      </div>`;
  }

  _buildPages(cur, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = [1];
    if (cur > 3) pages.push('…');
    for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i);
    if (cur < total - 2) pages.push('…');
    pages.push(total);
    return pages;
  }
}

window.Paginator = Paginator;
