// ─── ConsultationUI: product recommendation phase ─────────────────────────────

import type { AudiogramData, CustomerProfile, ProductId } from '../../types';
import { PRODUCTS, PRODUCT_MAP, getAvailableProducts } from '../../data/products';
import { AudioEngine } from '../core/AudioEngine';

export interface SaleResult {
  productId: ProductId;
  isPerfect: boolean;
  bonus: number;
  price: number;
}

export class ConsultationUI {
  private audio: AudioEngine;
  private customer: CustomerProfile | null = null;
  private audiogram: AudiogramData | null = null;
  private selectedProduct: ProductId | null = null;
  private onSaleCallback?: (result: SaleResult) => void;
  private day = 1;

  constructor(audio: AudioEngine) {
    this.audio = audio;
    document.getElementById('btn-confirm')!.addEventListener('click', () => this.confirmSale());
  }

  onSale(cb: (result: SaleResult) => void) { this.onSaleCallback = cb; }

  setDay(day: number) { this.day = day; }

  show(customer: CustomerProfile, audiogram: AudiogramData) {
    this.customer = customer;
    this.audiogram = audiogram;
    this.selectedProduct = null;

    document.getElementById('cp-phase-test')!.classList.add('hidden');
    document.getElementById('cp-phase-recommend')!.classList.remove('hidden');
    (document.getElementById('rec-feedback') as HTMLElement).classList.add('hidden');
    (document.getElementById('btn-confirm') as HTMLButtonElement).classList.add('hidden');

    this.renderProducts();
  }

  private renderProducts() {
    const grid = document.getElementById('product-grid')!;
    grid.innerHTML = '';
    const available = getAvailableProducts(this.day);

    PRODUCTS.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card';
      const isAvailable = available.find(a => a.id === p.id);
      if (!isAvailable) card.classList.add('locked');

      card.innerHTML = `
        <div class="pc-icon">${p.icon}</div>
        <div class="pc-info-row">
          <div class="pc-name">${p.name}</div>
          <span class="pc-badge ${p.badgeClass}">${p.shortName}</span>
        </div>
        <div class="pc-price">$${p.price.toLocaleString()}</div>
        <p class="pc-desc">${p.description}</p>
        ${!isAvailable ? '<div class="pc-locked-msg">🔒 Gün '+p.unlockDay+'</div>' : ''}
      `;
      card.style.borderColor = p.color + '40';

      if (isAvailable) {
        card.addEventListener('click', () => this.selectProduct(p.id));
      }
      grid.appendChild(card);
    });
  }

  private selectProduct(id: ProductId) {
    this.selectedProduct = id;
    document.querySelectorAll('.product-card').forEach((c, i) => {
      const p = PRODUCTS[i];
      c.classList.remove('selected');
      if (p.id === id) c.classList.add('selected');
    });

    (document.getElementById('btn-confirm') as HTMLButtonElement).classList.remove('hidden');
    (document.getElementById('rec-feedback') as HTMLElement).classList.add('hidden');
  }

  private confirmSale() {
    if (!this.selectedProduct || !this.customer || !this.audiogram) return;
    const product = PRODUCT_MAP.get(this.selectedProduct)!;
    const ideal   = this.customer.idealProduct;
    const isPerfect = this.selectedProduct === ideal;
    const isGood    = product.suitableFor.includes(this.audiogram.lossLevel);

    let bonus = 0;
    let feedbackClass = '';
    let feedbackMsg = '';

    if (isPerfect) {
      bonus = Math.floor(product.price * 0.5);
      feedbackClass = 'good';
      feedbackMsg = `⭐ Kusursuz öneri! +$${bonus} bonus`;
      this.audio.playSuccess();
    } else if (isGood) {
      bonus = Math.floor(product.price * 0.1);
      feedbackClass = 'ok';
      feedbackMsg = `👍 İyi seçim ama en iyisi değil. +$${bonus} bonus`;
      this.audio.playCoin();
    } else {
      bonus = 0;
      feedbackClass = 'bad';
      feedbackMsg = `❌ Bu hasta için uygun değil. Bonus yok.`;
      this.audio.playError();
    }

    // Highlight correct answer
    document.querySelectorAll('.product-card').forEach((c, i) => {
      const p = PRODUCTS[i];
      c.classList.remove('selected');
      if (p.id === ideal) c.classList.add('correct');
      else if (p.id === this.selectedProduct && !isPerfect) c.classList.add('wrong');
    });

    const fb = document.getElementById('rec-feedback')!;
    fb.className = `rec-feedback ${feedbackClass}`;
    fb.style.cssText = `display:block;border-radius:8px;padding:12px;font-size:14px;font-weight:700;text-align:center;margin-bottom:10px;`;
    if (feedbackClass === 'good')  { fb.style.background = 'rgba(39,174,96,0.15)'; fb.style.border = '1px solid #27ae60'; fb.style.color = '#27ae60'; }
    if (feedbackClass === 'ok')    { fb.style.background = 'rgba(245,197,24,0.1)'; fb.style.border = '1px solid #f5c518'; fb.style.color = '#f5c518'; }
    if (feedbackClass === 'bad')   { fb.style.background = 'rgba(231,76,60,0.1)'; fb.style.border = '1px solid #e74c3c'; fb.style.color = '#e74c3c'; }
    fb.textContent = feedbackMsg;
    fb.classList.remove('hidden');

    (document.getElementById('btn-confirm') as HTMLButtonElement).textContent = 'Bitti';
    (document.getElementById('btn-confirm') as HTMLButtonElement).onclick = () => {
      this.onSaleCallback?.({ productId: this.selectedProduct!, isPerfect, bonus, price: product.price });
    };
  }
}
