import type { CustomerProfile } from '../../types';

export class WaitingListUI {
  private countSpan: HTMLElement;
  private onSelectCustomer: (profile: CustomerProfile) => void;

  constructor(onSelectCustomer: (profile: CustomerProfile) => void, onOpen?: () => void) {
    this.countSpan = document.getElementById('waiting-count')!;
    this.onSelectCustomer = onSelectCustomer;

    const header = document.getElementById('waiting-list-header')!;
    header.addEventListener('click', () => {
      const modal = document.getElementById('full-waiting-modal')!;
      modal.classList.remove('hidden');
      modal.classList.add('active');
      if (onOpen) onOpen();
    });

    document.getElementById('btn-close-full-waiting')!.addEventListener('click', () => {
      this.closeFullModal();
    });
  }

  private renderItem(c: { profile: CustomerProfile; waitTimer: number; state: string }, container: HTMLElement) {
    const pct = Math.max(0, c.waitTimer / c.profile.patience);
    const color = pct > 0.5 ? '#27ae60' : pct > 0.25 ? '#f5c518' : '#e74c3c';
    
    const div = document.createElement('div');
    div.className = 'waiting-item';
    div.style.marginBottom = '8px';
    div.style.cursor = 'pointer';
    div.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; width: 100%;">
        <span style="font-size: 1.4em; display: flex; align-items: center; color: #fff;">
          <i data-lucide="user" style="width: 24px; height: 24px;"></i>
        </span>
        <div style="flex-grow: 1; font-size: 0.9em; line-height: 1.2;">
          <div style="font-weight: bold; color: #fff;">${c.profile.name}</div>
          <div class="waiting-patience-bar" style="width: ${pct * 100}%; background: ${color};"></div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end;">
          <span style="font-size: 0.8em; color: ${color}; font-weight: 800;">${Math.ceil(c.waitTimer)}s</span>
        </div>
      </div>
    `;
    div.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.closeFullModal();
      this.onSelectCustomer(c.profile as any);
    });
    container.appendChild(div);
  }

  // Dummy methods to maintain compatibility with GameLoop calls
  open() {}
  close() {}

  update(customers: { profile: CustomerProfile; waitTimer: number; state: string }[]) {
    const waiting = customers.filter(c => c.state !== 'served' && c.state !== 'leaving');
    this.countSpan.innerText = waiting.length.toString();

    const fullContent = document.getElementById('full-waiting-content')!;
    fullContent.innerHTML = '';
    
    if (waiting.length === 0) {
      fullContent.innerHTML = '<div style="font-size: 0.85em; color: #888; text-align: center; padding: 20px;">Bekleyen müşteri yok</div>';
      return;
    }

    // Only populate the full modal list
    waiting.forEach(c => this.renderItem(c, fullContent));
    (window as any).lucide?.createIcons();
  }

  private closeFullModal() {
    const modal = document.getElementById('full-waiting-modal')!;
    modal.classList.add('hidden');
    modal.classList.remove('active');
  }
}
