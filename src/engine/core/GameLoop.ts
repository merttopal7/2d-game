import { db } from './Database';
import { TravelUI } from '../TravelUI';
// ─── GameLoop: main game orchestration ────────────────────────────────────────

import type { GameState, CustomerProfile, AudiogramData, ScreenId } from '../../types';
import { spawnCustomer, resetCustomerIds } from '../../data/customers';
import { PRODUCTS } from '../../data/products';
import { INVENTORY } from '../../data/inventory';
import { ShopRenderer } from '../ShopRenderer';
import { AudioEngine } from './AudioEngine';
import { HearingTestUI } from '../ui/HearingTestUI';
import { ConsultationUI } from '../ui/ConsultationUI';
import { WaitingListUI } from '../ui/WaitingListUI';

const DAY_DURATION = 90;          // seconds per day
const SPAWN_INTERVAL_BASE = 8;    // faster spawning for testing
const MAX_CUSTOMERS = 5;          // higher limit to test "More" button

export class GameLoop {
  private state!: GameState;
  private renderer!: ShopRenderer;
  private audio: AudioEngine;
  private hearingTest!: HearingTestUI;
  private consultation!: ConsultationUI;
  private travelUI!: TravelUI;
  private waitingUI!: WaitingListUI;

  private lastTime = 0;
  private animId = 0;
  private spawnTimer = 0;
  private activeCustomer: CustomerProfile | null = null;
  private popupCustomer: CustomerProfile | null = null;
  private consultationPhase: 'test' | 'recommend' | 'none' = 'none';
  private toastTimer = 0;
  private particleAnimId = 0;
  private isSpawningEnabled = true;
  private activeInventoryCategory: 'flowers' | 'plants' | 'hearing-aid-devices' = 'flowers';
  private inventoryStock: Record<string, number> = {};
  private selectedInventoryItemId: string | null = null;

  constructor() {
    this.audio = new AudioEngine();
  }

  private showInteractionPopup(customer: CustomerProfile) {
    this.popupCustomer = customer;
    
    // Pan and focus camera on customer
    this.renderer.centerCameraOn(customer.id);
    this.renderer.focusedCustomerId = customer.id;
    this.waitingUI.close();
    
    // Fill customer info
    const emojiEl = document.getElementById('char-popup-emoji');
    const nameEl = document.getElementById('char-popup-name');
    const descEl = document.getElementById('char-popup-desc');
    
    if (emojiEl) emojiEl.textContent = customer.emoji;
    if (nameEl) nameEl.textContent = customer.name;
    if (descEl) descEl.textContent = `${customer.age} yaş — ${customer.description}`;
    
    // Disable consultation button if already busy with someone else
    const consultBtn = document.getElementById('btn-char-consult') as HTMLButtonElement;
    if (consultBtn) {
      if (this.activeCustomer && this.activeCustomer.id !== customer.id) {
        consultBtn.disabled = true;
        consultBtn.style.opacity = '0.5';
        consultBtn.title = "Zaten başka bir müşteriyle ilgileniyorsunuz.";
      } else {
        consultBtn.disabled = false;
        consultBtn.style.opacity = '1';
        consultBtn.title = "";
      }
    }

    // Ensure more menu is closed initially
    document.getElementById('char-more-menu')?.classList.add('hidden');
    
    document.getElementById('char-popup')!.classList.remove('hidden');
    this.audio.playClick();
  }

  private hideInteractionPopup(cancelTracing = true) {
    this.popupCustomer = null;
    if (cancelTracing) {
      this.renderer.isTracing = false;
      this.renderer.followingCustomerId = null;
      this.renderer.customerFollowsDoctorId = null;
      this.renderer.focusedCustomerId = null; // Return focus to doctor
    }
    document.getElementById('char-popup')?.classList.add('hidden');
    document.getElementById('char-more-menu')?.classList.add('hidden');
  }

  private openInventory() {
    this.renderInventoryUI();
    const modal = document.getElementById('inventory-modal')!;
    modal.classList.remove('hidden');
    modal.classList.add('active');
  }

  private closeInventory() {
    const modal = document.getElementById('inventory-modal')!;
    modal.classList.add('hidden');
    modal.classList.remove('active');
    this.closeInventoryItemPopup();
  }

  private openInventoryItemPopup(itemId: string) {
    const item = INVENTORY.find((entry) => entry.id === itemId);
    if (!item) return;

    this.selectedInventoryItemId = itemId;
    (document.getElementById('inventory-item-popup-title') as HTMLElement).textContent = item.name;
    (document.getElementById('inventory-item-popup-stock') as HTMLElement).textContent =
      `Stock: ${this.getSlotCount(item.id, item.stock)}`;
    (document.getElementById('inventory-item-popup') as HTMLElement).classList.remove('hidden');
  }

  private closeInventoryItemPopup() {
    this.selectedInventoryItemId = null;
    document.getElementById('inventory-item-popup')?.classList.add('hidden');
  }

  private async loadInventoryStock() {
    let defaults = Object.fromEntries(INVENTORY.map((item) => [item.id, item.stock]));
    const saved = await db.getVal('inventoryStock', null);
    if (saved && typeof saved === 'object') {
      this.inventoryStock = { ...defaults, ...(saved as Record<string, number>) };
    } else {
      // Set initial 5 flowers for 'flower-rose-red', others as default
      defaults = { ...defaults, 'flower-rose-red': 5 };
      this.inventoryStock = defaults;
      await db.setVal('inventoryStock', this.inventoryStock);
    }
  }

  private getSlotCount(itemId: string, fallback: number) {
    const count = this.inventoryStock[itemId];
    return typeof count === 'number' ? count : fallback;
  }

  private async addToInventoryFromPlant(plantType: 'flower' | 'bush' | 'tree') {
    const targetItemId = plantType === 'flower' ? 'flower-rose-red' : 'plant-snake';
    const current = this.getSlotCount(targetItemId, 0);
    this.inventoryStock[targetItemId] = current + 1;
    await db.setVal('inventoryStock', this.inventoryStock);
    if (document.getElementById('inventory-modal')?.classList.contains('active')) {
      this.renderInventoryUI();
    }
    this.toast(`Added to inventory: +1 ${plantType}`, 'success');
  }

  private async moveFlowerToShop(itemId: string) {
    if (this.renderer.currentMap !== 'shop') {
      this.toast('Flowers can only be placed in Shop room', 'warning');
      return;
    }

    const current = this.getSlotCount(itemId, 0);
    if (current <= 0) {
      this.toast('No stock left in storage', 'warning');
      return;
    }

    const placed = await this.renderer.placeFlowerFromStorage();
    if (!placed) {
      this.toast('Could not place flower in room', 'error');
      return;
    }

    this.inventoryStock[itemId] = current - 1;
    await db.setVal('inventoryStock', this.inventoryStock);
    this.renderInventoryUI();
    this.openInventoryItemPopup(itemId);
    this.toast('Flower moved from storage to room', 'success');
  }

  private async sellSelectedInventoryItem() {
    if (!this.selectedInventoryItemId) return;
    const item = INVENTORY.find((entry) => entry.id === this.selectedInventoryItemId);
    if (!item) return;

    const current = this.getSlotCount(item.id, item.stock);
    if (current <= 0) {
      this.toast('No stock left to sell', 'warning');
      return;
    }

    this.inventoryStock[item.id] = current - 1;
    await db.setVal('inventoryStock', this.inventoryStock);

    this.state.money += item.unitPrice;
    await db.setVal('money', this.state.money);

    this.renderInventoryUI();
    this.openInventoryItemPopup(item.id);
    this.updateHUD();
    this.toast(`Sold: ${item.name} +$${item.unitPrice}`, 'success');
  }

  private async moveSelectedItemToShop() {
    if (!this.selectedInventoryItemId) return;
    const item = INVENTORY.find((entry) => entry.id === this.selectedInventoryItemId);
    if (!item) return;

    if (item.category !== 'flowers') {
      this.toast('Only flowers can be moved to shop for now', 'warning');
      return;
    }

    await this.moveFlowerToShop(item.id);
    this.closeInventoryItemPopup();
    this.closeInventory();
  }

  private renderInventoryUI() {
    const container = document.getElementById('inventory-content') as HTMLElement;
    const sections: Array<{ title: string; category: 'flowers' | 'plants' | 'hearing-aid-devices' }> = [
      { title: 'Flowers', category: 'flowers' },
      { title: 'Plants', category: 'plants' },
      { title: 'Hearing Aid Devices', category: 'hearing-aid-devices' },
    ];
    const activeSection = sections.find((s) => s.category === this.activeInventoryCategory) ?? sections[0];
    const items = INVENTORY.filter((item) => item.category === activeSection.category);
    const tabsHTML = sections.map((section) => `
      <button class="inventory-tab ${section.category === activeSection.category ? 'active' : ''}" data-category="${section.category}">
        ${section.title}
      </button>
    `).join('');
    const itemsHTML = items.map((item) => {
      const isLowStock = item.stock <= item.reorderLevel;
      return `
        <div class="inventory-slot ${isLowStock ? 'low' : ''}" data-item-id="${item.id}" data-item-category="${item.category}" title="${item.name}">
          <div class="inventory-slot-image">${item.image}</div>
          <div class="inventory-slot-count">${this.getSlotCount(item.id, item.stock)}</div>
          <div class="inventory-slot-name">${item.name}</div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="inventory-tabs">${tabsHTML}</div>
      <div class="inventory-slots">
        ${itemsHTML || '<div class="inventory-item-meta">No items</div>'}
      </div>
    `;

    container.querySelectorAll<HTMLButtonElement>('.inventory-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const category = tab.dataset.category as 'flowers' | 'plants' | 'hearing-aid-devices' | undefined;
        if (!category || category === this.activeInventoryCategory) return;
        this.activeInventoryCategory = category;
        this.renderInventoryUI();
      });
    });

    container.querySelectorAll<HTMLElement>('.inventory-slot').forEach((slot) => {
      slot.addEventListener('click', () => {
        const itemId = slot.dataset.itemId;
        if (!itemId) return;
        this.openInventoryItemPopup(itemId);
      });
    });
  }

  init() {
    // Renderer
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.renderer = new ShopRenderer(canvas);
    this.renderer.onCustomerClick(c => this.showInteractionPopup(c));
    this.renderer.onPlantRemove((plantType) => {
      void this.addToInventoryFromPlant(plantType);
    });

        
    
    // Character popup event handlers
    document.getElementById('btn-char-consult')!.addEventListener('click', () => {
      if (this.popupCustomer) {
        this.openConsultation(this.popupCustomer);
        this.hideInteractionPopup(true);
      }
    });
    
    document.getElementById('btn-char-more')!.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('char-more-menu')?.classList.toggle('hidden');
    });

    document.getElementById('btn-char-doctor-follow')!.addEventListener('click', () => {
      if (this.popupCustomer) {
        this.renderer.setDoctorFollowsCustomer(this.popupCustomer.id);
        this.hideInteractionPopup(false);
      }
    });
    document.getElementById('btn-char-customer-follow')!.addEventListener('click', () => {
      if (this.popupCustomer) {
        this.renderer.setCustomerFollowsDoctor(this.popupCustomer.id);
        this.hideInteractionPopup(false);
      }
    });
    document.getElementById('btn-char-remove')!.addEventListener('click', () => {
      if (this.popupCustomer) {
        this.renderer.removeCustomer(this.popupCustomer.id, 'leaving');
        this.hideInteractionPopup(true);
      }
    });
    document.getElementById('btn-char-close')!.addEventListener('click', () => this.hideInteractionPopup(true));

    // Global click listener to close dropdowns
    window.addEventListener('click', () => {
      document.getElementById('char-more-menu')?.classList.add('hidden');
    });
    document.getElementById('btn-open-inventory')!.addEventListener('click', () => this.openInventory());
    document.getElementById('btn-close-inventory')!.addEventListener('click', () => this.closeInventory());
    document.getElementById('inventory-modal')!.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeInventory();
    });
    document.getElementById('btn-inventory-sell')!.addEventListener('click', () => {
      void this.sellSelectedInventoryItem();
    });
    document.getElementById('btn-inventory-move-shop')!.addEventListener('click', () => {
      void this.moveSelectedItemToShop();
    });
    document.getElementById('btn-inventory-action-close')!.addEventListener('click', () => this.closeInventoryItemPopup());
    document.getElementById('inventory-item-popup')!.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeInventoryItemPopup();
    });

    // Sub-UIs
    this.hearingTest = new HearingTestUI(this.audio);
    this.hearingTest.onDone(data => this.onTestDone(data));
    this.hearingTest.onToneStart((duration) => {
      this.renderer.setConsultationOpen(true);
      this.renderer.doctorInteract(duration);
    });
    this.hearingTest.onAction(() => {
      if (this.activeCustomer) {
        this.renderer.addPatience(this.activeCustomer.id, 5);
      }
    });

                this.travelUI = new TravelUI(
                  async (dest) => {
        console.log("Traveling to:", dest);
        if (dest === 'cafe' || dest === 'shop') {
          this.renderer.startTravelAnimation(async () => {
            await this.renderer.setMap(dest as 'shop' | 'cafe');
            await db.setVal('currentMap', dest);
            this.renderer.player.alpha = 1; 
            
            const btnSpawn = document.getElementById('btn-toggle-spawn')!;
            if (dest === 'shop') {
              btnSpawn.style.display = 'flex';
            } else {
              btnSpawn.style.display = 'none';
            }

            this.toast(dest === 'cafe' ? "Kafeye gelindi! ☕" : "Mağazaya dönüldü! 🏥");
          });
        }
      },
      () => {
        this.renderer.player.alpha = 1; // Show doctor if cancelled
      }
    );

    this.renderer.onCarClick(() => {
      this.audio.playClick();
      this.renderer.player.alpha = 0; // Hide doctor (get in car)
      this.travelUI.show();
    });
    this.consultation = new ConsultationUI(this.audio);
    this.consultation.onSale(result => this.onSaleComplete(result));

    this.waitingUI = new WaitingListUI((profileOrId: any) => {
      // Handle both ID and Profile to be safe during transition
      const profile = typeof profileOrId === 'object' ? profileOrId : this.renderer.customers.find(c => c.profile.id === profileOrId)?.profile;
      
      if (profile) {
        requestAnimationFrame(() => {
          this.showInteractionPopup(profile);
        });
        this.waitingUI.close();
      }
    }, () => this.renderer.resetCamera());

    // Consultation panel close
    document.getElementById('cp-close')!.addEventListener('click', () => this.closeConsultation());

    // Pause
    document.getElementById('btn-pause')!.addEventListener('click', () => this.pause());
    document.getElementById('btn-resume')!.addEventListener('click', () => this.resume());
    document.getElementById('btn-pause-quit')!.addEventListener('click', () => { this.stop(); this.showScreen('screen-title'); });

    // Fullscreen (HUD + Alt Buttons)
    const toggleFS = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
          if (screen.orientation && (screen.orientation as any).lock) {
            (screen.orientation as any).lock('landscape').catch(() => {});
          }
        }).catch(() => {});
      } else {
        if (document.exitFullscreen) document.exitFullscreen();
      }
    };

    document.getElementById('btn-fullscreen')?.addEventListener('click', toggleFS);
    document.querySelectorAll('.btn-fullscreen-alt').forEach(btn => {
      btn.addEventListener('click', toggleFS);
    });

    // Summary
    document.getElementById('btn-next-day')!.addEventListener('click', () => this.startNextDay());
    document.getElementById('btn-quit-sum')!.addEventListener('click', () => { this.stop(); this.showScreen('screen-title'); });

    // Game over
    document.getElementById('btn-retry')!.addEventListener('click', () => this.startGame());
    document.getElementById('btn-go-menu')!.addEventListener('click', () => { this.stop(); this.showScreen('screen-title'); });
    // Camera Lock
        // Spawn toggle
    const btnSpawn = document.getElementById('btn-toggle-spawn')!;
    btnSpawn.addEventListener('click', () => {
      this.isSpawningEnabled = !this.isSpawningEnabled;
      btnSpawn.classList.toggle('active', this.isSpawningEnabled);
      this.toast(this.isSpawningEnabled ? "Müşteri kabulü açıldı" : "Müşteri kabulü kapatıldı", this.isSpawningEnabled ? 'success' : 'warning');
    });

    // Camera Lock
    const lockBtn = document.getElementById('btn-lock-camera')!;
    lockBtn.addEventListener('click', () => {
      this.renderer.isCameraLocked = !this.renderer.isCameraLocked;
      lockBtn.classList.toggle('active', this.renderer.isCameraLocked);
      lockBtn.innerHTML = this.renderer.isCameraLocked ? '🔒' : '🔓';
    });
    this.renderer.onUnlockCamera(() => {
      lockBtn.classList.remove('active');
      lockBtn.innerHTML = '🔓';
    });

    // Title screen
    this.loadHighScores();
  }

      async startGame() {
    resetCustomerIds();
    
    const savedMoney = await db.getVal('money', 500);
    const savedMap = await db.getVal('currentMap', 'shop');
    await this.loadInventoryStock();

    this.state = {
      day: 1, money: savedMoney, score: 0,
      totalServed: 0, dayEarnings: 0, dayServed: 0, dayPerfect: 0,
      daySales: [], unlockedProducts: new Set(['CIC', 'RIC', 'ITE', 'BTE']),
      isPaused: false, isRunning: true,
      dayDuration: DAY_DURATION, dayTimeLeft: DAY_DURATION,
      highScore: this.getHighScore(), bestEarnings: this.getBestEarnings(),
    };
    this.consultation.setDay(1);
    this.renderer.customers = [];
    await this.renderer.setMap(savedMap as 'shop' | 'cafe'); // Restore map
    this.spawnTimer = 0; // immediate spawn
    this.activeCustomer = null;
    this.consultationPhase = 'none';
    this.closeConsultation();
    this.updateHUD();
    this.showScreen('screen-game');
    this.renderer.resize();          // sync resize — canvas is visible now
    this.lastTime = performance.now();
    cancelAnimationFrame(this.animId);
    this.animId = requestAnimationFrame(t => this.loop(t));
  }
  stop() {
    cancelAnimationFrame(this.animId);
    this.state.isRunning = false;
  }

  private loop(ts: number) {
    if (!this.state.isRunning) return;
    if (this.state.isPaused) {
      this.lastTime = ts;
      this.animId = requestAnimationFrame(t => this.loop(t));
      return;
    }

    const dt = Math.min((ts - this.lastTime) / 1000, 0.1);
    this.lastTime = ts;

    this.update(dt);
    this.renderer.draw();
    this.animId = requestAnimationFrame(t => this.loop(t));
  }

  private update(dt: number) {
    // Day timer (Disabled)

    // Handle character arrival for consultation
    if (this.consultationPhase === 'approaching' && this.activeCustomer) {
      if (this.renderer.areCharactersArrived(this.activeCustomer.id)) {
        this.startActualConsultationUI(this.activeCustomer);
      }
    }

    // Endless mode

    // Spawn customers
    this.spawnTimer -= dt;
    const interval = 8; // Constant spawning interval
    if (this.renderer.currentMap === 'shop' && this.isSpawningEnabled && this.spawnTimer <= 0 && this.renderer.customers.length < MAX_CUSTOMERS) {
      this.spawnTimer = interval;
      
      // Prevent duplicate names
      let c: CustomerProfile | null = null;
      const existingNames = this.renderer.customers.map(item => item.profile.name);
      
      for (let i = 0; i < 10; i++) {
        const candidate = spawnCustomer(this.state.day);
        if (!existingNames.includes(candidate.name)) {
          c = candidate;
          break;
        }
      }
      
      if (c) {
        const slot = this.renderer.customers.length;
        this.renderer.addCustomer(c, slot);
      }
    }

    // Update renderer (gets impatient customer back)
    const impatient = this.renderer.update(dt);
    
    // Update WaitingList UI
    this.waitingUI.update(this.renderer.customers);

    if (impatient) {
      this.renderer.removeCustomer(impatient.id, 'leaving');
      this.toast(`${impatient.name} left without a device 😞`, 'warning');
      if (this.activeCustomer?.id === impatient.id) this.closeConsultation();
    }

    
    // Toast timer
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) {
        document.getElementById('toast')!.classList.add('hidden');
      }
    }

    this.updateHUD();
  }

  // ── Consultation ───────────────────────────────────────────────────────────
  private openConsultation(customer: CustomerProfile) {
    if (this.activeCustomer) return; // already in one
    this.activeCustomer = customer;
    this.renderer.setSelected(customer.id);
    this.renderer.setConsultationOpen(true);
    this.consultationPhase = 'approaching';
    this.waitingUI.close();
  }

  private startActualConsultationUI(customer: CustomerProfile) {
    if (this.consultationPhase !== 'approaching') return;
    this.consultationPhase = 'test';

    // Fill header
    (document.getElementById('cp-avatar') as HTMLElement).textContent = customer.emoji;
    (document.getElementById('cp-name') as HTMLElement).textContent = customer.name;
    (document.getElementById('cp-desc') as HTMLElement).textContent = `${customer.age}yo — ${customer.description}`;

    // Show test phase
    document.getElementById('step-1')!.classList.add('active');
    document.getElementById('step-2')!.classList.remove('active');
    document.getElementById('cp-phase-test')!.classList.remove('hidden');
    document.getElementById('cp-phase-recommend')!.classList.add('hidden');
    document.getElementById('consultation-panel')!.classList.remove('hidden');

    this.hearingTest.start(customer);
  }

  private closeConsultation() {
    this.activeCustomer = null;
    this.renderer.setSelected(null);
    this.renderer.setConsultationOpen(false);
    this.consultationPhase = 'none';
    document.getElementById('consultation-panel')!.classList.add('hidden');
  }

  private onTestDone(data: AudiogramData) {
    if (!this.activeCustomer) return;
    this.consultationPhase = 'recommend';
    document.getElementById('step-1')!.classList.remove('active');
    document.getElementById('step-2')!.classList.add('active');
    this.consultation.show(this.activeCustomer, data);
  }

  private onSaleComplete(result: { productId: string; isPerfect: boolean; bonus: number; price: number }) {
    if (!this.activeCustomer) return;
    const customer = this.activeCustomer;
    const total = result.price + result.bonus;

    this.state.money += total;
    this.state.dayEarnings += total;
    this.state.dayServed++;
    this.state.totalServed++;
    if (result.isPerfect) this.state.dayPerfect++;

    const scoreGain = result.isPerfect ? 100 : 50;
    this.state.score += scoreGain;

    this.renderer.removeCustomer(customer.id, 'served');
    this.closeConsultation();

    const msg = result.isPerfect
      ? `⭐ Perfect! +$${total.toLocaleString()} earned`
      : `💰 Sale closed! +$${total.toLocaleString()} earned`;
    this.toast(msg, result.isPerfect ? 'success' : 'info');

    this.audio.playCoin();
    this.updateHUD();
  }

  // ── Day flow ───────────────────────────────────────────────────────────────
  private endDay() {
    this.state.isRunning = false;
    cancelAnimationFrame(this.animId);
    this.closeConsultation();

    // Check for new unlocks
    let unlockMsg = '';
    if (this.state.day >= 3 && !this.state.unlockedProducts.has('BCH')) {
      this.state.unlockedProducts.add('BCH');
      unlockMsg = '🔴 Bone Conduction Headband unlocked!';
    }
    if (this.state.day >= 5 && !this.state.unlockedProducts.has('SMART')) {
      this.state.unlockedProducts.add('SMART');
      unlockMsg = '🌟 Premium Smart hearing aid unlocked!';
    }

    // Grade
    const perfect = this.state.dayPerfect;
    const served  = this.state.dayServed;
    const grade = served === 0 ? 'F'
      : perfect / served >= 0.8 ? 'S'
      : perfect / served >= 0.6 ? 'A'
      : perfect / served >= 0.4 ? 'B'
      : perfect / served >= 0.2 ? 'C' : 'D';

    // Save high scores
    if (this.state.score > this.getHighScore()) localStorage.setItem('hcs_highscore', String(this.state.score));
    if (this.state.money > this.getBestEarnings()) localStorage.setItem('hcs_bestearnings', String(this.state.money));

    // Fill summary
    (document.getElementById('sum-served') as HTMLElement).textContent = String(served);
    (document.getElementById('sum-earnings') as HTMLElement).textContent = `$${this.state.dayEarnings.toLocaleString()}`;
    (document.getElementById('sum-perfect') as HTMLElement).textContent = String(perfect);
    (document.getElementById('sum-score') as HTMLElement).textContent = String(this.state.score);
    (document.getElementById('sum-grade') as HTMLElement).textContent = grade;
    const unlockEl = document.getElementById('sum-unlock')!;
    if (unlockMsg) { unlockEl.textContent = unlockMsg; unlockEl.classList.remove('hidden'); }
    else unlockEl.classList.add('hidden');

    // Game over if no sales and past day 3
    if (served === 0 && this.state.day > 3) {
      this.showGameOver('No customers were served. The shop lost revenue!');
      return;
    }

    this.showScreen('screen-summary');
  }

  private startNextDay() {
    this.state.day++;
    this.state.dayEarnings = 0;
    this.state.dayServed = 0;
    this.state.dayPerfect = 0;
    this.state.daySales = [];
    this.state.isRunning = true;
    this.state.dayTimeLeft = DAY_DURATION;
    this.renderer.customers = [];
    this.spawnTimer = 3;
    this.consultation.setDay(this.state.day);
    this.updateHUD();
    this.showScreen('screen-game');
    this.renderer.resize();          // sync resize
    this.lastTime = performance.now();
    this.animId = requestAnimationFrame(t => this.loop(t));
  }

  private showGameOver(reason: string) {
    (document.getElementById('go-reason') as HTMLElement).textContent = reason;
    (document.getElementById('go-score') as HTMLElement).textContent = String(this.state.score);
    (document.getElementById('go-earnings') as HTMLElement).textContent = `$${this.state.money.toLocaleString()}`;
    (document.getElementById('go-days') as HTMLElement).textContent = String(this.state.day);
    this.showScreen('screen-gameover');
  }

  // ── Pause ──────────────────────────────────────────────────────────────────
  private pause() {
    this.state.isPaused = true;
    document.getElementById('screen-pause')!.style.display = 'flex';
    document.getElementById('screen-pause')!.style.zIndex = '500';
  }

  private resume() {
    this.state.isPaused = false;
    document.getElementById('screen-pause')!.style.display = 'none';
    this.lastTime = performance.now();
  }

  // ── HUD ────────────────────────────────────────────────────────────────────
  private updateHUD() {
    (document.getElementById('hud-money-val') as HTMLElement).textContent = this.state.money.toLocaleString();
    (document.getElementById('hud-score-val') as HTMLElement).textContent = String(this.state.score);
    (document.getElementById('hud-day-val') as HTMLElement).textContent = String(this.state.day);
    (document.getElementById('hud-served') as HTMLElement).textContent = String(this.state.dayServed);
  }

  // ── Toast ──────────────────────────────────────────────────────────────────
  toast(msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
    const el = document.getElementById('toast')!;
    el.textContent = msg;
    el.className = type;
    el.classList.remove('hidden');
    this.toastTimer = 3;
  }

  // ── Screens ────────────────────────────────────────────────────────────────
  showScreen(id: ScreenId) {
    document.querySelectorAll<HTMLElement>('.screen').forEach(s => {
      s.classList.remove('active');
      s.style.display = '';
    });
    const el = document.getElementById(id)!;
    el.classList.add('active');
    el.style.display = 'flex';
  }

  // ── Persist ────────────────────────────────────────────────────────────────
  private getHighScore(): number { return parseInt(localStorage.getItem('hcs_highscore') ?? '0'); }
  private getBestEarnings(): number { return parseInt(localStorage.getItem('hcs_bestearnings') ?? '0'); }
  loadHighScores() {
    (document.getElementById('title-highscore') as HTMLElement).textContent = String(this.getHighScore());
    (document.getElementById('title-bestearnings') as HTMLElement).textContent = String(this.getBestEarnings());
  }
}
