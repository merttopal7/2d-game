import { db } from './Database';
import { TravelUI } from '../TravelUI';
// ─── GameLoop: main game orchestration ────────────────────────────────────────

import type { GameState, CustomerProfile, AudiogramData, ScreenId } from '../../types';
import { spawnCustomer, resetCustomerIds } from '../../data/customers';
import { PRODUCTS } from '../../data/products';
import { INVENTORY, InventoryCategory } from '../../data/inventory';
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
  private selectedHeadStyle: number | null = null;

  private lastTime = 0;
  private animId = 0;
  private spawnTimer = 0;
  private activeCustomer: CustomerProfile | null = null;
  private popupCustomer: CustomerProfile | null = null;
  private consultationPhase: 'test' | 'recommend' | 'none' = 'none';
  private toastTimer = 0;
  private particleAnimId = 0;
  private isSpawningEnabled = false;
  private activeInventoryCategory: InventoryCategory = 'flowers';
  private inventoryStock: Record<string, number> = {};
  private selectedInventoryItemId: string | null = null;
  private isMarketMode = false;

  constructor() {
    this.audio = new AudioEngine();
  }

  private showInteractionPopup(customer: CustomerProfile) {
    this.popupCustomer = customer;
    
    // Pan and focus camera on customer (Disabled as per user request)
    // this.renderer.centerCameraOn(customer.id);
    // this.renderer.focusedCustomerId = customer.id;
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

  private openInventory(marketMode = false) {
    this.isMarketMode = marketMode;
    this.renderInventoryUI();
    const modal = document.getElementById('inventory-modal')!;
    const title = modal.querySelector('h2')!;
    if (this.isMarketMode) {
      if (this.renderer.currentMap === 'cafe') title.textContent = 'Starbucks Cafe';
      else if (this.renderer.currentMap === 'market') title.textContent = 'Teknik Market';
      else title.textContent = 'Balık Ekmekçi';
    } else {
      title.textContent = 'Envanter';
    }
    
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
      `Stok: ${this.getSlotCount(item.id, item.stock)}`;
    const displayPrice = this.isMarketMode ? item.purchasePrice : item.unitPrice;
    const priceLabel = this.isMarketMode ? 'Alış Fiyatı' : 'Satış Fiyatı';
    (document.getElementById('inventory-item-popup-price') as HTMLElement).textContent =
      `${priceLabel}: $${displayPrice}`;
    
    const sellBtn = document.getElementById('btn-inventory-sell')!;
    const buyBtn = document.getElementById('btn-inventory-buy')!;
    const buyEatBtn = document.getElementById('btn-inventory-buy-eat')!;
    const consumeBtn = document.getElementById('btn-inventory-consume')!;
    const moveBtn = document.getElementById('btn-inventory-move-shop')!;

    // Logic for showing buttons
    if (this.isMarketMode) {
      buyBtn.classList.remove('hidden');
      // Only show "Buy & Eat" for food items
      if (item.category === 'food') {
        buyEatBtn.classList.remove('hidden');
      } else {
        buyEatBtn.classList.add('hidden');
      }
      consumeBtn.classList.add('hidden');
      sellBtn.classList.add('hidden');
      moveBtn.classList.add('hidden');
    } else {
      buyBtn.classList.add('hidden');
      buyEatBtn.classList.add('hidden');
      sellBtn.classList.remove('hidden');
      moveBtn.classList.toggle('hidden', item.category !== 'flowers');
      
      // Show consume button if it's food and we have stock in inventory
      if (item.category === 'food' && this.getSlotCount(item.id, 0) > 0) {
        consumeBtn.classList.remove('hidden');
      } else {
        consumeBtn.classList.add('hidden');
      }
    }

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
    this.toast(`Envantere eklendi: +1 ${plantType}`, 'success');
  }

  private async moveFlowerToShop(itemId: string) {
    if (this.renderer.currentMap !== 'shop') {
      this.toast('Çiçekler sadece Mağaza bölümüne yerleştirilebilir', 'warning');
      return;
    }

    const current = this.getSlotCount(itemId, 0);
    if (current <= 0) {
      this.toast('Depoda stok kalmadı', 'warning');
      return;
    }

    const placed = await this.renderer.placeFlowerFromStorage();
    if (!placed) {
      this.toast('Çiçek odaya yerleştirilemedi', 'error');
      return;
    }

    this.inventoryStock[itemId] = current - 1;
    await db.setVal('inventoryStock', this.inventoryStock);
    this.renderInventoryUI();
    this.openInventoryItemPopup(itemId);
    this.toast('Çiçek depodan odaya taşındı', 'success');
  }

  private async sellSelectedInventoryItem() {
    if (!this.selectedInventoryItemId) return;
    const item = INVENTORY.find((entry) => entry.id === this.selectedInventoryItemId);
    if (!item) return;

    const current = this.getSlotCount(item.id, item.stock);
    if (current <= 0) {
      this.toast('Satılacak stok kalmadı', 'warning');
      return;
    }

    this.inventoryStock[item.id] = current - 1;
    await db.setVal('inventoryStock', this.inventoryStock);

    this.state.money += item.unitPrice;
    await db.setVal('money', this.state.money);

    this.renderInventoryUI();
    this.openInventoryItemPopup(item.id);
    this.updateHUD();
    this.toast(`Satıldı: ${item.name} +$${item.unitPrice}`, 'success');
  }

  private async buySelectedItem() {
    if (!this.selectedInventoryItemId) return;
    const item = INVENTORY.find((entry) => entry.id === this.selectedInventoryItemId);
    if (!item) return;

    const price = item.purchasePrice;
    if (this.state.money < price) {
      this.toast('Yeterli paranız yok!', 'error');
      return;
    }

    const current = this.getSlotCount(item.id, item.stock);
    this.inventoryStock[item.id] = current + 1;
    await db.setVal('inventoryStock', this.inventoryStock);

    this.state.money -= price;
    await db.setVal('money', this.state.money);

    this.renderInventoryUI();
    this.openInventoryItemPopup(item.id);
    this.updateHUD();
    this.audio.playClick();
    this.toast(`Envantere eklendi: ${item.name} -$${price}`, 'success');
  }

  private async buyAndConsumeSelectedItem() {
    if (!this.selectedInventoryItemId) return;
    const item = INVENTORY.find((entry) => entry.id === this.selectedInventoryItemId);
    if (!item) return;

    const price = item.purchasePrice;
    if (this.state.money < price) {
      this.toast('Yeterli paranız yok!', 'error');
      return;
    }

    // Immediate consumption
    this.renderer.player.eatEmoji = item.id === 'kahve' ? '☕' : '🥪';
    this.renderer.player.eatTimer = 3.0;
    this.closeInventory();

    this.state.money -= price;
    await db.setVal('money', this.state.money);

    this.updateHUD();
    this.audio.playClick();
    this.toast(`${item.name} satın alındı ve afiyetle tüketildi! -$${price}`, 'success');
  }

  private async consumeSelectedItem() {
    if (!this.selectedInventoryItemId) return;
    const item = INVENTORY.find((entry) => entry.id === this.selectedInventoryItemId);
    if (!item) return;

    const current = this.getSlotCount(item.id, 0);
    if (current <= 0) return;

    this.inventoryStock[item.id] = current - 1;
    await db.setVal('inventoryStock', this.inventoryStock);

    this.renderer.player.eatEmoji = item.id === 'kahve' ? '☕' : '🥪';
    this.renderer.player.eatTimer = 3.0;
    this.closeInventory();
    
    this.audio.playClick();
    this.toast(`${item.name} afiyetle tüketildi!`, 'success');
  }

  private async moveSelectedItemToShop() {
    if (!this.selectedInventoryItemId) return;
    const item = INVENTORY.find((entry) => entry.id === this.selectedInventoryItemId);
    if (!item) return;

    if (item.category !== 'flowers') {
      this.toast('Şimdilik sadece çiçekler mağazaya taşınabilir', 'warning');
      return;
    }

    await this.moveFlowerToShop(item.id);
    this.closeInventoryItemPopup();
    this.closeInventory();
  }

  private renderInventoryUI() {
    const container = document.getElementById('inventory-content') as HTMLElement;
    const sections: Array<{ title: string; category: InventoryCategory }> = [
      { title: 'Çiçekler', category: 'flowers' },
      { title: 'Bitkiler', category: 'plants' },
      { title: 'İşitme Cihazları', category: 'hearing-aid-devices' },
      { title: 'Yiyecek', category: 'food' },
    ];
    
    // In market mode, only show food or hearing aids depending on map
    const filteredSections = this.isMarketMode 
      ? sections.filter(s => {
          if (this.renderer.currentMap === 'market') return s.category === 'hearing-aid-devices';
          return s.category === 'food';
        }) 
      : sections;
    const activeSection = filteredSections.find((s) => s.category === this.activeInventoryCategory) ?? filteredSections[0];
    let items = INVENTORY.filter((item) => item.category === activeSection.category);
    
    // Filter food based on map in market mode
    if (this.isMarketMode && activeSection.category === 'food') {
      if (this.renderer.currentMap === 'cafe') {
        items = items.filter(i => i.id === 'kahve');
      } else if (this.renderer.currentMap === 'samandag') {
        items = items.filter(i => i.id === 'food-fish-bread');
      }
    }
    const tabsHTML = filteredSections.length > 1 ? filteredSections.map((section) => `
      <button class="inventory-tab ${section.category === activeSection.category ? 'active' : ''}" data-category="${section.category}">
        ${section.title}
      </button>
    `).join('') : '';
    const itemsHTML = items.map((item) => {
      const isLowStock = item.stock <= item.reorderLevel;
      return `
        <div class="inventory-slot ${isLowStock ? 'low' : ''}" data-item-id="${item.id}" data-item-category="${item.category}" title="${item.name}">
          <div class="inventory-slot-image"><i data-lucide="${item.image}"></i></div>
          <div class="inventory-slot-count">${this.getSlotCount(item.id, item.stock)}</div>
          <div class="inventory-slot-name">${item.name}</div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="inventory-tabs">${tabsHTML}</div>
      <div class="inventory-slots">
        ${itemsHTML || '<div class="inventory-item-meta">Öğe yok</div>'}
      </div>
    `;

    container.querySelectorAll<HTMLButtonElement>('.inventory-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        const category = tab.dataset.category as 'flowers' | 'plants' | 'hearing-aid-devices' | 'food' | undefined;
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

    (window as any).lucide?.createIcons();
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
    document.getElementById('btn-char-focus')!.addEventListener('click', () => {
      if (this.popupCustomer) {
        this.renderer.centerCameraOn(this.popupCustomer.id);
        this.renderer.focusedCustomerId = this.popupCustomer.id;
        this.renderer.isCameraLocked = true;
        const lockBtn = document.getElementById('btn-lock-camera')!;
        if (lockBtn) {
          lockBtn.classList.add('active');
          lockBtn.innerHTML = '<i data-lucide="lock"></i>';
          (window as any).lucide?.createIcons();
        }
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
    document.getElementById('btn-inventory-buy')!.addEventListener('click', () => {
      void this.buySelectedItem();
    });
    document.getElementById('btn-inventory-buy-eat')!.addEventListener('click', () => {
      void this.buyAndConsumeSelectedItem();
    });
    document.getElementById('btn-inventory-consume')!.addEventListener('click', () => {
      void this.consumeSelectedItem();
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
        if (dest === 'cafe' || dest === 'shop' || dest === 'samandag' || dest === 'market') {
          this.renderer.startTravelAnimation(async () => {
            await this.renderer.setMap(dest as any);
            await db.setVal('currentMap', dest);
            this.renderer.player.alpha = 1;
            this.updateMapContextUI();

            let msg = "Yola çıkıldı!";
            if (dest === 'cafe') msg = "Kafeye gelindi! ☕";
            else if (dest === 'shop') msg = "Mağazaya dönüldü! 🏥";
            else if (dest === 'samandag') msg = "Samandağ Sahili'ne gelindi! 🏖️";
            else if (dest === 'market') msg = "Teknik Market'e gelindi! ⚙️";
            this.toast(msg);
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
      this.travelUI.show(this.renderer.currentMap);
    });
    this.renderer.onBuffetClickEvent(() => {
      this.audio.playClick();
      if (this.renderer.currentMap === 'market') {
        this.activeInventoryCategory = 'hearing-aid-devices';
      } else {
        this.activeInventoryCategory = 'food';
      }
      this.openInventory(true); // Open in market mode
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
    
    // Initial Audio State
    const savedMute = localStorage.getItem('hcs_muted') === 'true';
    this.audio.setMuted(savedMute);
    const audioBtn = document.getElementById('btn-toggle-audio')!;
    if (audioBtn) {
      audioBtn.innerHTML = savedMute 
        ? '<i data-lucide="volume-x"></i> Ses Kapalı' 
        : '<i data-lucide="volume-2"></i> Ses Açık';
    }

    document.getElementById('btn-toggle-audio')!.addEventListener('click', () => {
      const isMuted = !this.audio.isMuted;
      this.audio.setMuted(isMuted);
      localStorage.setItem('hcs_muted', String(isMuted));
      const btn = document.getElementById('btn-toggle-audio')!;
      btn.innerHTML = isMuted 
        ? '<i data-lucide="volume-x"></i> Ses Kapalı' 
        : '<i data-lucide="volume-2"></i> Ses Açık';
      (window as any).lucide?.createIcons();
    });
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
      lockBtn.innerHTML = this.renderer.isCameraLocked ? '<i data-lucide="lock"></i>' : '<i data-lucide="lock-open"></i>';
      (window as any).lucide?.createIcons();
    });
    this.renderer.onUnlockCamera(() => {
      lockBtn.classList.remove('active');
      lockBtn.innerHTML = '<i data-lucide="lock-open"></i>';
      (window as any).lucide?.createIcons();
    });

    // Reset Database
    document.getElementById('btn-reset-db')!.addEventListener('click', () => {
      this.showConfirm(
        'Tüm Verileri Sil?', 
        'Tüm oyun ilerlemeniz ve birikmiş paranız kalıcı olarak silinecektir. Bu işlem geri alınamaz!',
        () => {
          void db.clearAll().then(() => {
            window.location.reload();
          });
        }
      );
    });

    // Backup: Export
    document.getElementById('btn-export-save')!.addEventListener('click', async () => {
      const json = await db.exportData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SonaIsitme_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      this.toast('Yedek başarıyla indirildi', 'success');
    });

    // Backup: Import
    const importInput = document.getElementById('input-import-save') as HTMLInputElement;
    document.getElementById('btn-import-save')!.addEventListener('click', () => {
      importInput.click();
    });

    importInput.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        const json = event.target?.result as string;
        const ok = await db.importData(json);
        if (ok) {
          this.toast('Yedek başarıyla geri yüklendi! Sayfa yenileniyor...', 'success');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          this.toast('Yedek geri yüklenemedi! Dosya geçersiz olabilir.', 'error');
        }
      };
      reader.readAsText(file);
      importInput.value = ''; // Reset
    });

    // Title screen
    this.loadHighScores();

    // Char select confirm
    const confirmBtn = document.getElementById('btn-char-select-confirm') as HTMLButtonElement;
    const nameInput = document.getElementById('input-char-name') as HTMLInputElement;

    if (confirmBtn && nameInput) {
      confirmBtn.addEventListener('click', () => this.confirmCharSelection());
      
      nameInput.addEventListener('input', () => {
        confirmBtn.disabled = !nameInput.value.trim() || this.selectedHeadStyle === null;
      });
    }
  }

  private openCharSelection() {
    this.showScreen('screen-char-select');
    this.renderCharOptions();
  }

  private renderCharOptions() {
    const grid = document.getElementById('char-options-grid')!;
    grid.innerHTML = '';
    this.selectedHeadStyle = null;
    const confirmBtn = document.getElementById('btn-char-select-confirm') as HTMLButtonElement;
    confirmBtn.disabled = true;

    for (let i = 0; i < 10; i++) {
      const opt = document.createElement('div');
      opt.className = 'char-option';
      opt.dataset.index = i.toString();
      
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d')!;
      
      // We need a dummy character instance to call drawHead
      // Since drawHead is now public, we can call it on the player or any instance
      ctx.translate(50, 70); // Center the head
      ctx.scale(1.2, 1.2);
      this.renderer.player.drawHead(ctx, i);

      opt.appendChild(canvas);
      
      opt.addEventListener('click', () => {
        grid.querySelectorAll('.char-option').forEach(el => el.classList.remove('selected'));
        opt.classList.add('selected');
        this.selectedHeadStyle = i;
        const nameInput = document.getElementById('input-char-name') as HTMLInputElement;
        confirmBtn.disabled = !nameInput.value.trim();
        this.audio.playClick();
      });
      
      grid.appendChild(opt);
    }
  }

  private async confirmCharSelection() {
    const nameInput = document.getElementById('input-char-name') as HTMLInputElement;
    const name = nameInput.value.trim();
    if (this.selectedHeadStyle === null || !name) return;
    
    await db.setVal('playerHead', this.selectedHeadStyle);
    await db.setVal('playerName', name);
    await db.setVal('isCharSelected', true);
    
    this.renderer.player.headStyle = this.selectedHeadStyle;
    this.renderer.player.name = name;
    
    this.audio.playClick();
    this.startGame(); // Re-call startGame to proceed
  }

  private showConfirm(title: string, msg: string, onYes: () => void) {
    const modal = document.getElementById('confirm-modal')!;
    const titleEl = document.getElementById('confirm-title')!;
    const msgEl = document.getElementById('confirm-msg')!;
    const yesBtn = document.getElementById('btn-confirm-yes')!;
    const noBtn = document.getElementById('btn-confirm-no')!;

    titleEl.textContent = title;
    msgEl.textContent = msg;
    modal.classList.add('active'); // Use active instead of hidden

    const handleYes = () => {
      onYes();
      modal.classList.remove('active');
      cleanup();
    };
    const handleNo = () => {
      modal.classList.remove('active');
      cleanup();
    };
    const cleanup = () => {
      yesBtn.removeEventListener('click', handleYes);
      noBtn.removeEventListener('click', handleNo);
    };

    yesBtn.addEventListener('click', handleYes);
    noBtn.addEventListener('click', handleNo);
  }

  async startGame() {
    resetCustomerIds();
    
    // Check for character selection first
    const isCharSelected = await db.getVal('isCharSelected', false);
    const savedHead = await db.getVal('playerHead', null);
    const savedName = await db.getVal('playerName', null);
    
    // If flag is missing OR data is missing, force fresh selection and wipe any partial/old data
    if (!isCharSelected || savedHead === null || savedName === null || !savedName.trim()) {
      await db.clearAll(); // Wipe DB to ensure clean start
      this.openCharSelection();
      return;
    }
    this.renderer.player.headStyle = savedHead;
    this.renderer.player.name = savedName;
    
    const savedMoney = await db.getVal('money', 500);
    const savedTotalServed = await db.getVal('totalServed', 0);
    const savedMap = await db.getVal('currentMap', 'shop');
    await this.loadInventoryStock();

    this.isSpawningEnabled = false;
    const btnSpawn = document.getElementById('btn-toggle-spawn')!;
    btnSpawn.classList.remove('active');

    this.state = {
      day: 1, money: savedMoney, score: 0,
      totalServed: savedTotalServed, dayEarnings: 0, dayServed: 0, dayPerfect: 0,
      daySales: [],
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
    this.updateMapContextUI();
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

    // Lock camera on customer
    this.renderer.centerCameraOn(customer.id);
    this.renderer.focusedCustomerId = customer.id;
    this.renderer.isCameraLocked = true;
    const lockBtn = document.getElementById('btn-lock-camera')!;
    if (lockBtn) {
      lockBtn.classList.add('active');
      lockBtn.innerHTML = '<i data-lucide="lock"></i>';
      (window as any).lucide?.createIcons();
    }
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
    this.consultation.show(this.activeCustomer, data, this.inventoryStock);
  }

  private onSaleComplete(result: { productId: string; isPerfect: boolean; bonus: number; price: number }) {
    if (!this.activeCustomer) return;
    const customer = this.activeCustomer;
    const total = result.price + result.bonus;

    this.state.money += total;
    this.state.dayEarnings += total;
    this.state.dayServed++;
    this.state.totalServed++;
    void db.setVal('totalServed', this.state.totalServed);
    if (result.isPerfect) this.state.dayPerfect++;

    const scoreGain = result.isPerfect ? 100 : 50;
    this.state.score += scoreGain;

    // Deduct stock
    const currentStock = this.inventoryStock[result.productId] || 0;
    if (currentStock > 0) {
      this.inventoryStock[result.productId] = currentStock - 1;
      void db.setVal('inventoryStock', this.inventoryStock);
    }

    this.renderer.removeCustomer(customer.id, 'served');
    this.closeConsultation();

    const msg = result.isPerfect
      ? `⭐ Mükemmel! +$${total.toLocaleString()} kazanıldı`
      : `💰 Satış yapıldı! +$${total.toLocaleString()} kazanıldı`;
    this.toast(msg, result.isPerfect ? 'success' : 'info');

    this.audio.playCoin();
    this.updateHUD();
  }

  // ── Day flow ───────────────────────────────────────────────────────────────
  private endDay() {
    this.state.isRunning = false;
    cancelAnimationFrame(this.animId);
    this.closeConsultation();

    // Check for new unlocks (Removed)
    let unlockMsg = '';

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
    document.getElementById('screen-pause')!.style.zIndex = '999999';
  }

  private resume() {
    this.state.isPaused = false;
    document.getElementById('screen-pause')!.style.display = 'none';
    this.lastTime = performance.now();
  }

  // ── HUD ────────────────────────────────────────────────────────────────────
  private updateHUD() {
    (document.getElementById('hud-money-val') as HTMLElement).textContent = this.state.money.toLocaleString();
    const scoreVal = document.getElementById('hud-score-val');
    if (scoreVal) scoreVal.textContent = String(this.state.score);
    (document.getElementById('hud-total-served-val') as HTMLElement).textContent = String(this.state.totalServed);
    (document.getElementById('hud-day-val') as HTMLElement).textContent = String(this.state.day);
  }

  // ── Toast ──────────────────────────────────────────────────────────────────
  toast(msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
    const el = document.getElementById('toast')!;
    el.textContent = msg;
    el.className = type;
    el.classList.remove('hidden');
    this.toastTimer = 3;
  }

  private updateMapContextUI() {
    const isShop = this.renderer.currentMap === 'shop';
    const btnSpawn = document.getElementById('btn-toggle-spawn');
    const waitingPanel = document.getElementById('waiting-list-panel');
    
    if (btnSpawn) btnSpawn.classList.toggle('hidden', !isShop);
    if (waitingPanel) waitingPanel.classList.toggle('hidden', !isShop);
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
