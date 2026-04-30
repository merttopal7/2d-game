import { BaseMap } from './maps/BaseMap';
import { ShopMap } from './maps/ShopMap';
import { CafeMap } from './maps/CafeMap';
import { SamandagMap } from './maps/SamandagMap';
import { MarketMap } from './maps/MarketMap';
import { db } from './core/Database';
// ─── ShopRenderer: draws the shop scene + animated customers on canvas ────────

import type { CustomerProfile } from '../types';
import { Character, Player, Customer } from './entities/Character';
import { Car } from './entities/Car';
import { Plant } from './entities/Plant';

const SLOTS = [
  { x: 0.15, y: 0.42 },
  { x: 0.35, y: 0.36 },
  { x: 0.20, y: 0.61 },
  { x: 0.40, y: 0.57 },
  { x: 0.10, y: 0.30 },
];
const APP_ROOM_SLOT = { x: 0.79, y: 0.40 }; // Higher up inside booth
const DOCTOR_APP_SLOT = { x: 0.76, y: 0.40 }; // Closer to customer

const COLORS = {
  floorTile1: '#1a2535',
  floorTile2: '#1e2d40',
  wall: '#0f1926',
  counter: '#2c1e0f',
  counterTop: '#8B6914',
  shelf: '#3d2b0f',
  shelfTop: '#5c4020',
  window: '#1a3a5c',
  windowGlass: 'rgba(100,180,255,0.15)',
  plant: '#1a4a1a',
  sign: '#00c9a7',
};

export class ShopRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  public customers: Customer[] = [];
  public player: Player;
  private time = 0;
  private onClickCustomer?: (c: CustomerProfile) => void;
  private onCameraUnlock?: () => void;
  private onClickCar?: () => void;
  private onPlantRemoved?: (plantType: 'flower' | 'bush' | 'tree') => void;
  private onBuffetClick?: () => void;

  public MAP_W = 2400;
  public MAP_H = 1000;
  public cameraX = 0;
  public cameraY = 0;
  public isConsultationOpen = false;
  public isCameraLocked = true;
  public focusedCustomerId: number | null = null;
  private isDragging = false;
  private isDraggingMiniMap = false;
  private draggingPlant: Plant | null = null;
  private selectedPlant: Plant | null = null;
  private isManualCamera = false;
  public isTracing = false;
  public followingCustomerId: number | null = null;
  public customerFollowsDoctorId: number | null = null;
  public currentMap: 'shop' | 'cafe' | 'samandag' | 'market' = 'shop';
  public weather: 'sunny' | 'rainy' = 'rainy';
  private rainDrops: Array<{x: number, y: number, len: number, speed: number}> = [];
  private maps: Map<string, BaseMap> = new Map();
  private plants: Plant[] = [];
  private pendingPlant: Plant | null = null;
  private pendingCarInteraction: boolean = false;
  private playerCar: Car | null = null;
  private isTraveling: boolean = false;
  private travelCallback?: () => void;
  private targetMarker: { x: number, y: number, alpha: number, type: 'move' | 'interact' } | null = null;
  private cars: Car[] = [];
  private carIdCounter = 0;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private traceDelayTimer = 0;
  private isRemovingPlant = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    this.player = new Player(1120, 610);
    window.addEventListener('resize', () => this.resize());
    
    // Mouse interactions for panning and clicking
                canvas.addEventListener('mousedown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const worldX = mx + this.cameraX;
      const worldY = my + this.cameraY;
      const mm = this.getMiniMapRect();

      this.startX = e.clientX;
      this.startY = e.clientY;
      this.isDragStarted = false;
      this.wasDragging = false;
      this.isMouseDown = true;
      this.isMouseDown = true;

      if (mx >= mm.x && mx <= mm.x + mm.w && my >= mm.y && my <= mm.y + mm.h) {
        this.isDraggingMiniMap = true;
        this.isManualCamera = true;
        this.handleMiniMapDrag(mx, my, mm);
      } else {
                // Check for plant click start
        let clickedPlant = null;
        for (const p of this.plants) {
          const dx = worldX - p.x, dy = worldY - p.y;
          if (p.isInteractive && Math.sqrt(dx*dx + dy*dy) < 35) {
            clickedPlant = p;
            break;
          }
        }
        if (clickedPlant) {
          this.isDragging = false; 
        } else {
          // Don't set isDragging = true yet, wait for move threshold
          this.isDragging = false; 
        }
      }
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

        window.addEventListener('mouseup', async () => {
      if (this.draggingPlant) {
        // Save new position to DB
        const p = this.draggingPlant;
        const existing = await db.plants.where({ map: this.currentMap, x: p.x, y: p.y }).first();
        // Since we don't have IDs easily mapped here, we might need to update by location or clear/refill
        // For simplicity, let's just update the DB with all current plants
        await db.plants.where('map').equals(this.currentMap).delete();
        for (const pl of this.plants) {
          await db.plants.add({
            map: this.currentMap, x: pl.x, y: pl.y, type: pl.type, 
            waterLevel: pl.waterLevel, lastWatered: pl.lastWatered
          });
        }
      }
      this.isMouseDown = false;
      this.isMouseDown = false;
      this.isDragging = false;
      this.isDraggingMiniMap = false;
      this.draggingPlant = null;
    });

            canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      if (this.draggingPlant) {
        this.draggingPlant.x = mx + this.cameraX;
        this.draggingPlant.y = my + this.cameraY;
      } else if (this.isDraggingMiniMap) {
        this.handleMiniMapDrag(mx, my, this.getMiniMapRect());
        this.wasDragging = true;
      } else {
        // Check drag threshold (5 pixels)
        if (this.isMouseDown && !this.isDragging && !this.isDraggingMiniMap) {
          const dist = Math.sqrt(Math.pow(e.clientX - this.startX, 2) + Math.pow(e.clientY - this.startY, 2));
          if (dist > 5) {
            this.isDragging = true;
            this.wasDragging = true;
            this.isManualCamera = true;
            if (this.isCameraLocked) {
              this.isCameraLocked = false;
              this.focusedCustomerId = null;
              if (this.onCameraUnlock) this.onCameraUnlock();
            }
          }
        }

        if (this.isDragging) {
          this.cameraX -= (e.clientX - this.lastMouseX);
          this.cameraY -= (e.clientY - this.lastMouseY);
          this.lastMouseX = e.clientX;
          this.lastMouseY = e.clientY;
          this.clampCamera();
        } else {
          this.handleHover(e);
        }
      }
    });

        // Plant Popup Buttons
    document.getElementById('btn-plant-water')!.addEventListener('click', async () => {
      if (this.selectedPlant) {
        const p = this.selectedPlant;
        p.water();
        const rec = await db.plants.where({ map: this.currentMap, x: p.x, y: p.y }).first();
        if (rec?.id) {
          await db.plants.update(rec.id, { waterLevel: p.waterLevel, lastWatered: p.lastWatered });
        }
        this.closePlantPopup();
      }
    });
    document.getElementById('btn-plant-move')!.addEventListener('click', () => {
      if (this.selectedPlant) {
        this.draggingPlant = this.selectedPlant;
        this.closePlantPopup();
      }
    });
    document.getElementById('btn-plant-remove')!.addEventListener('click', async () => {
      if (!this.selectedPlant || this.isRemovingPlant) return;
      this.isRemovingPlant = true;
      try {
        const p = this.selectedPlant;
        this.closePlantPopup(); // clear selection immediately to avoid double-remove clicks
        this.plants = this.plants.filter(item => item !== p);
        await db.plants.where({ map: this.currentMap, x: p.x, y: p.y }).delete();
        if (p.isInteractive) {
          this.onPlantRemoved?.(p.type);
        }
      } finally {
        this.isRemovingPlant = false;
      }
    });
    document.getElementById('btn-plant-close')!.addEventListener('click', () => {
      this.closePlantPopup();
    });

    canvas.addEventListener('click', (e) => {
      // Prevent clicking characters through mini-map
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const mm = this.getMiniMapRect();
      if (mx >= mm.x && mx <= mm.x + mm.w && my >= mm.y && my <= mm.y + mm.h) return;

      this.handleClick(e);
    });

    // Touch support for mobile
        canvas.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const mx = touch.clientX - rect.left;
      const my = touch.clientY - rect.top;
      const worldX = mx + this.cameraX;
      const worldY = my + this.cameraY;
      const mm = this.getMiniMapRect();

      this.startX = touch.clientX;
      this.startY = touch.clientY;
      this.lastMouseX = touch.clientX;
      this.lastMouseY = touch.clientY;
      this.isDragStarted = false;
      this.wasDragging = false;
      this.isMouseDown = true;
      this.isMouseDown = true;

      if (mx >= mm.x && mx <= mm.x + mm.w && my >= mm.y && my <= mm.y + mm.h) {
        this.isDraggingMiniMap = true;
        this.isManualCamera = true;
        this.handleMiniMapDrag(mx, my, mm);
        e.preventDefault();
      } else {
                // Check for plant click start
        let clickedPlant = null;
        for (const p of this.plants) {
          const dx = worldX - p.x, dy = worldY - p.y;
          if (p.isInteractive && Math.sqrt(dx*dx + dy*dy) < 35) {
            clickedPlant = p;
            break;
          }
        }
        if (clickedPlant) {
          this.isDragging = false; 
        } else {
          // Wait for threshold in touchmove
          this.isDragging = false; 
        }
      }
    }, { passive: false });
        canvas.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const mx = touch.clientX - rect.left;
      const my = touch.clientY - rect.top;

      if (this.draggingPlant) {
        this.draggingPlant.x = mx + this.cameraX;
        this.draggingPlant.y = my + this.cameraY;
        e.preventDefault();
      } else if (this.isDraggingMiniMap) {
        this.handleMiniMapDrag(mx, my, this.getMiniMapRect());
        this.wasDragging = true;
        e.preventDefault();
      } else {
        // Check drag threshold (5 pixels)
        if (this.isMouseDown && !this.isDragging && !this.isDraggingMiniMap) {
          const dist = Math.sqrt(Math.pow(touch.clientX - this.startX, 2) + Math.pow(touch.clientY - this.startY, 2));
          if (dist > 5) {
            this.isDragging = true;
            this.wasDragging = true;
            this.isManualCamera = true;
            if (this.isCameraLocked) {
              this.isCameraLocked = false;
              this.focusedCustomerId = null;
              if (this.onCameraUnlock) this.onCameraUnlock();
            }
          }
        }

        if (this.isDragging) {
          this.cameraX -= (touch.clientX - this.lastMouseX);
          this.cameraY -= (touch.clientY - this.lastMouseY);
          this.lastMouseX = touch.clientX;
          this.lastMouseY = touch.clientY;
          this.clampCamera();
          e.preventDefault();
        }
      }
    }, { passive: false });

    canvas.addEventListener('touchend', async () => {
      if (this.draggingPlant) {
        await db.plants.where('map').equals(this.currentMap).delete();
        for (const pl of this.plants) {
          await db.plants.add({
            map: this.currentMap, x: pl.x, y: pl.y, type: pl.type, 
            waterLevel: pl.waterLevel, lastWatered: pl.lastWatered
          });
        }
      }
      this.isMouseDown = false;
      this.isMouseDown = false;
      this.isDragging = false;
      this.isDraggingMiniMap = false;
      this.draggingPlant = null;
    });
    this.isTraveling = false;
        this.maps.set('shop', new ShopMap(this));
    this.maps.set('cafe', new CafeMap(this));
    this.maps.set('samandag', new SamandagMap(this));
    this.maps.set('market', new MarketMap(this));
    this.playerCar = new Car('player_car', 1050, 580, '#ffffff', 'passenger');
    this.cars = [this.playerCar];
    // initPlants is now called via setMap (async)
  }

    private getMiniMapRect() {
    const padding = 20;
    const mmW = Math.min(220, this.canvas.width * 0.25);
    const mmH = (mmW / this.MAP_W) * this.MAP_H;
    const mmX = padding;
    const mmY = this.canvas.height - mmH - padding;
    return { x: mmX, y: mmY, w: mmW, h: mmH };
  }

  private handleMiniMapDrag(mx: number, my: number, mm: any) {
    const localX = mx - mm.x;
    const localY = my - mm.y;
    const scale = this.MAP_W / mm.w;
    
    // Center camera on the clicked spot on mini-map
    this.cameraX = localX * scale - this.canvas.width / 2;
    this.cameraY = localY * scale - this.canvas.height / 2;
        if (this.isCameraLocked) {
          this.isCameraLocked = false;
          this.focusedCustomerId = null; // Clear focus on manual move
          if (this.onCameraUnlock) this.onCameraUnlock();
        }
    this.clampCamera();
  }

  onCustomerClick(cb: (c: CustomerProfile) => void) { this.onClickCustomer = cb; }
  onUnlockCamera(cb: () => void) { this.onCameraUnlock = cb; }
  onCarClick(cb: () => void) { this.onClickCar = cb; }
  onPlantRemove(cb: (plantType: 'flower' | 'bush' | 'tree') => void) { this.onPlantRemoved = cb; }
  onBuffetClickEvent(cb: () => void) { this.onBuffetClick = cb; }

  async placeFlowerFromStorage(): Promise<boolean> {
    if (this.currentMap !== 'shop') return false;

    const basePos = { x: this.player.x, y: this.player.y - 30 };
    const candidateOffsets: Array<{ x: number; y: number }> = [
      { x: 0, y: 0 },
      { x: 45, y: 0 },
      { x: -45, y: 0 },
      { x: 0, y: 45 },
      { x: 0, y: -45 },
      { x: 32, y: 32 },
      { x: -32, y: 32 },
      { x: 32, y: -32 },
      { x: -32, y: -32 },
    ];

    const chosen = candidateOffsets
      .map((offset) => ({
        x: Math.max(20, Math.min(this.MAP_W - 20, basePos.x + offset.x)),
        y: Math.max(120, Math.min(this.MAP_H - 120, basePos.y + offset.y)),
      }))
      .find((pos) => {
        return this.plants.every((p) => {
          const dx = p.x - pos.x;
          const dy = p.y - pos.y;
          return Math.sqrt(dx * dx + dy * dy) >= 60;
        });
      }) ?? basePos;

    const flower = new Plant(chosen.x, chosen.y, 'flower', true);
    this.plants.push(flower);
    await db.plants.add({
      map: 'shop',
      x: flower.x,
      y: flower.y,
      type: flower.type,
      waterLevel: flower.waterLevel,
      lastWatered: Date.now(),
    });
    return true;
  }

  private clampCamera() {
    const maxCamX = Math.max(0, this.MAP_W - this.canvas.width);
    const maxCamY = Math.max(0, this.MAP_H - this.canvas.height);
    this.cameraX = Math.max(0, Math.min(this.cameraX, maxCamX));
    this.cameraY = Math.max(0, Math.min(this.cameraY, maxCamY));
  }

  resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.clampCamera();
  }

  addCustomer(profile: CustomerProfile, slot: number) {
    const s = SLOTS[slot % SLOTS.length];
    const cw = this.MAP_W, ch = this.MAP_H;
    
    // Spawn a Taxi to deliver the customer
    const taxiId = `car_${++this.carIdCounter}`;
    const entranceX = (cw * 0.70) / 2; // Middle of waiting area
    
    const taxi = new Car(taxiId, -200, 720, '#f1c40f', 'taxi');
    taxi.targetX = entranceX - 70;
    (taxi as any).state = 'arriving';
    (taxi as any).dropTimer = 1.5;
    (taxi as any).customerId = profile.id;
    this.cars.push(taxi);

    // Create the customer but hide them (x: -500) until the taxi drops them off
    const customer = new Customer(profile, slot, -500, 740);
    customer.targetX = cw * s.x;
    customer.targetY = ch * s.y;
    this.customers.push(customer);
  }

  removeCustomer(id: number, outcome: 'served' | 'leaving') {
    const c = this.customers.find(c => c.profile.id === id);
    if (c) {
      c.state = outcome;
      c.targetY = 740; c.targetX = this.MAP_W + 200; // Walk down to road and leave
    }
  }

  setConsultationOpen(isOpen: boolean) {
    this.isConsultationOpen = isOpen;
    if (!isOpen) {
      // Logic for auto-moving the doctor to counter was removed to keep them at the car or current spot
    }
  }
  
  doctorInteract(duration: number = 1.0) {
    this.doctorInteractTimer = duration;
  }

  setCustomerFollowsDoctor(id: number | null) {
    this.customerFollowsDoctorId = id;
    this.followingCustomerId = null;
    this.isTracing = false;
    if (id !== null) {
      const c = this.customers.find(item => item.profile.id === id);
      if (c) {
        c.state = 'waiting'; 
        c.targetX = c.x;
        c.targetY = c.y;
      }
    }
  }

  setDoctorFollowsCustomer(id: number | null) {
    this.followingCustomerId = id;
    this.customerFollowsDoctorId = null;
    this.isTracing = true; // Snap back to doctor on trace
  }

  addPatience(id: number, seconds: number) {
    const c = this.customers.find(item => item.profile.id === id);
    if (c) {
      c.waitTimer = Math.min(c.profile.patience, c.waitTimer + seconds);
    }
  }

      startTravelAnimation(callback: () => void) {
    if (!this.playerCar) return;
    this.isTraveling = true;
    this.isCameraLocked = true;
    this.travelCallback = callback;
    (this.playerCar as any).state = 'leaving'; // Reuse existing state logic
  }

    async setMap(mapType: 'shop' | 'cafe' | 'samandag' | 'market') {
    this.currentMap = mapType;
    this.customers = [];
    
    // Standardized positions for player and car across all maps
    this.player.x = 1120;
    this.player.y = 610; // Next to car
    
    if (this.playerCar) {
      this.playerCar.x = 1050;
      this.playerCar.y = 580; // On the sidewalk
    }

    this.player.targetX = this.player.x;
    this.player.targetY = this.player.y;

    // Snap camera to player on map change
    this.cameraX = this.player.x - this.canvas.width / 2;
    this.cameraY = this.player.y - this.canvas.height / 2;
    this.clampCamera();

    const mapObj = this.maps.get(mapType);
    if (mapObj) {
      await mapObj.initPlants();
    }
  }

  resetCamera() {
  }

  setSelected(id: number | null) { // Snap back to doctor on consultation
    const cw = this.MAP_W, ch = this.MAP_H;
    this.customers.forEach(c => {
      c.selected = c.profile.id === id;
      if (c.state !== 'leaving' && c.state !== 'served') {
        if (c.selected) {
          // Both move to the exact same booth location
          c.targetX = cw * APP_ROOM_SLOT.x;
          c.targetY = ch * APP_ROOM_SLOT.y;
          c.state = 'walking';
          
          this.player.targetX = cw * DOCTOR_APP_SLOT.x;
          this.player.targetY = ch * DOCTOR_APP_SLOT.y;
          
          this.isTracing = false;
          this.isConsultationOpen = true; 
        } else {
          const s = SLOTS[c.slot % SLOTS.length];
          c.targetX = cw * s.x;
          c.targetY = ch * s.y;
          c.state = 'walking';
        }
      }
    });
  }

  areCharactersArrived(customerId: number): boolean {
    const c = this.customers.find(item => item.profile.id === customerId);
    if (!c) return true;
    
    const pdx = this.player.targetX - this.player.x, pdy = this.player.targetY - this.player.y;
    const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
    
    // If following, 'arrived' means close to doctor who has reached target
    if (this.customerFollowsDoctorId === customerId) {
      const dx = this.player.x - c.x, dy = this.player.y - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return pDist < 5 && dist < 100;
    }
    
    const cdx = c.targetX - c.x, cdy = c.targetY - c.y;
    const cDist = Math.sqrt(cdx * cdx + cdy * cdy);
    
    return cDist < 5 && pDist < 5;
  }

  update(dt: number): CustomerProfile | null {
    this.time += dt;
    this.plants.forEach(p => p.update(dt));
    if (this.traceDelayTimer > 0) this.traceDelayTimer -= dt;

    // 1. PLAYER (Doctor) follows customer
    if (this.followingCustomerId) {
      const targetC = this.customers.find(c => c.profile.id === this.followingCustomerId);
      if (targetC) {
        const dx = targetC.x - this.player.x;
        const dy = targetC.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const buffer = 100;
        
        if (dist > buffer) {
          this.player.targetX = targetC.x - (dx / dist) * 70;
          this.player.targetY = targetC.y - (dy / dist) * 70;
        } else if (dist < buffer - 20) {
          // Stop if already close enough
          this.player.targetX = this.player.x;
          this.player.targetY = this.player.y;
        }
      }
    }
    this.player.update(dt);
        // Handle arrival at car
    if (this.pendingCarInteraction) {
      const dx = (this.playerCar!.x + 30) - this.player.x;
      const dy = (this.playerCar!.y + 70) - this.player.y;
      if (Math.sqrt(dx * dx + dy * dy) < 10) {
        if (this.onClickCar) this.onClickCar();
        this.pendingCarInteraction = false;
      }
    }
        if (this.targetMarker) {
      this.targetMarker.alpha -= dt * 2;
      if (this.targetMarker.alpha <= 0) this.targetMarker = null;
    }
        // Handle pending interactions (like watering)
    if (this.pendingPlant) {
      const dx = this.pendingPlant.x - this.player.x;
      const dy = (this.pendingPlant.y + 45) - this.player.y;
      if (Math.sqrt(dx * dx + dy * dy) < 10) {
        this.pendingPlant.water();
        this.doctorInteract(1.5); // Raise hands for 1.5s
        this.pendingPlant = null;
      }
    }

    // 2. CUSTOMERS
    let impatient: CustomerProfile | null = null;
    for (const c of this.customers) {
      c.update(dt);

      // Random wandering or following logic
      if (c.state === 'waiting' || (this.customerFollowsDoctorId === c.profile.id && c.state === 'walking')) {
        if (this.customerFollowsDoctorId === c.profile.id) {
          const dx = this.player.x - c.x;
          const dy = this.player.y - c.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (this.isConsultationOpen || c.selected) {
            c.targetX = this.player.x - (dx / dist) * 30;
            c.targetY = this.player.y - (dy / dist) * 30;
            c.state = 'walking';
          } else {
            const buffer = 100;
            if (dist > buffer) {
              c.targetX = this.player.x - (dx / dist) * 70;
              c.targetY = this.player.y - (dy / dist) * 70;
              c.state = 'walking';
            } else if (dist < buffer - 20) {
              c.targetX = c.x;
              c.targetY = c.y;
              c.state = 'waiting';
            }
          }
                } else if (!c.selected && (!c.wanderTimer || c.wanderTimer <= 0)) {
          const s = SLOTS[c.slot % SLOTS.length];
          const range = 450;
          const midX = this.MAP_W * 0.70;
          const sidewalkY = 560;
          
          let tx = this.MAP_W * s.x + (Math.random() - 0.5) * range;
          let ty = this.MAP_H * s.y + (Math.random() - 0.5) * range;
          
          // Clamp to Waiting Room
          c.targetX = Math.max(50, Math.min(tx, midX - 50));
          c.targetY = Math.max(180, Math.min(ty, sidewalkY - 50));
          
          c.state = 'walking';
          c.wanderTimer = 1.0 + Math.random() * 3;
        }
      }

      if (c.state === 'waiting' && c.waitTimer <= 0 && !impatient) {
        impatient = c.profile;
      }
    }

        // 3. CARS
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const car = this.cars[i];
      const state = (car as any).state;
      
      if (state === 'arriving') {
        car.x += (car.targetX - car.x) * 4 * dt;
        if (Math.abs(car.x - car.targetX) < 5) (car as any).state = 'dropping';
      } else if (state === 'dropping') {
        (car as any).dropTimer -= dt;
        if ((car as any).dropTimer <= 0) {
          const cust = this.customers.find(c => c.profile.id === (car as any).customerId);
          if (cust && cust.x < 0) { cust.x = car.x + 70; cust.y = car.y + 30; }
          (car as any).state = 'leaving';
          car.targetX = this.MAP_W + 300;
        }
      } else if (state === 'leaving') {
                        car.x += 400 * dt; // Faster travel
        // Move car from sidewalk (580) to road (720) gradually
        if (car === this.playerCar && this.isTraveling) {
          const targetRoadY = 720;
          if (car.y < targetRoadY) car.y += 100 * dt; 
          this.player.x = car.x + 70;
          this.player.y = car.y + 30;
          this.player.targetX = this.player.x;
          this.player.targetY = this.player.y;
        }
        if (car.x > this.MAP_W + 250) {
          if (car === this.playerCar && this.isTraveling) {
            this.isTraveling = false;
            // Reset car to starting position for the new map (Standardized)
            this.playerCar.x = 1050;
            this.playerCar.y = 580;
            (this.playerCar as any).state = 'idle';
            if (this.travelCallback) this.travelCallback();
            this.travelCallback = undefined;
          } else if (car.id !== 'player_car') {
            this.cars.splice(i, 1);
          }
        }
      }
    }

        // 4. CAMERA
    if (this.isCameraLocked && !this.isDragging && !this.isDraggingMiniMap) {
      let targetX = this.player.x, targetY = this.player.y;
      
      // Follow focused customer if set
      if (this.focusedCustomerId !== null) {
        const targetC = this.customers.find(c => c.profile.id === this.focusedCustomerId);
        if (targetC) {
          targetX = targetC.x;
          targetY = targetC.y;
        }
      }

      // Follow car if traveling
      if (this.isTraveling && this.playerCar) {
        targetX = this.playerCar.x + 70;
        targetY = this.playerCar.y + 30;
      } else if (this.isTracing || this.customerFollowsDoctorId || this.isConsultationOpen) {
        if (this.focusedCustomerId === null) {
          targetY = this.player.y - this.canvas.height * 0.25;
        }
      }

      let targetCamX = targetX - this.canvas.width / 2;
      const targetCamY = targetY - this.canvas.height / 2;
      if (this.isConsultationOpen) targetCamX += Math.min(this.canvas.width / 4, 200); 
      this.cameraX += (targetCamX - this.cameraX) * 5 * dt;
      this.cameraY += (targetCamY - this.cameraY) * 5 * dt;
      this.clampCamera();
    }

    this.customers = this.customers.filter(c => c.alpha > 0.01);
    return impatient;
  }


  private drawEntities() {
    // Combine characters and plants for z-sorting
    const entities: (Character | Plant)[] = [
      ...this.customers,
      this.player,
      ...this.plants
    ];
    entities.sort((a, b) => a.y - b.y);

            // Draw target marker
    if (this.targetMarker) {
      this.ctx.save();
      this.ctx.globalAlpha = this.targetMarker.alpha;
      const isInteract = this.targetMarker.type === 'interact';
      
      this.ctx.strokeStyle = isInteract ? '#f1c40f' : '#00c9a7'; // Yellow for interact, Teal for move
      this.ctx.lineWidth = isInteract ? 4 : 3;
      
      this.ctx.beginPath();
      if (isInteract) {
        // Diamond shape for interaction
        const size = 15 + (1 - this.targetMarker.alpha) * 15;
        this.ctx.moveTo(this.targetMarker.x, this.targetMarker.y - size);
        this.ctx.lineTo(this.targetMarker.x + size, this.targetMarker.y);
        this.ctx.lineTo(this.targetMarker.x, this.targetMarker.y + size);
        this.ctx.lineTo(this.targetMarker.x - size, this.targetMarker.y);
        this.ctx.closePath();
      } else {
        // Ring for movement
        this.ctx.arc(this.targetMarker.x, this.targetMarker.y, 10 + (1 - this.targetMarker.alpha) * 20, 0, Math.PI * 2);
      }
      this.ctx.stroke();
      
      if (isInteract) {
        // Pulse effect for interaction
        this.ctx.fillStyle = 'rgba(241, 196, 15, 0.2)';
        this.ctx.fill();
      }
      
      this.ctx.restore();
    }
    entities.forEach(e => e.draw(this.ctx, this.canvas.height));
  }


  getCharacterScreenPos(id: number): { x: number, y: number } | null {
    const c = this.customers.find(item => item.profile.id === id);
    if (!c) return null;
    return {
      x: c.x - this.cameraX,
      y: (c.y - 45) - this.cameraY // position above head
    };
  }

  centerCameraOn(id: number) {
    const c = this.customers.find(item => item.profile.id === id);
    if (!c) return;
    this.cameraX = c.x - this.canvas.width / 2;
    this.cameraY = c.y - this.canvas.height / 2;
    this.clampCamera();
  }

      draw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(-this.cameraX, -this.cameraY);
    
    const mapObj = this.maps.get(this.currentMap);
    if (mapObj) {
      mapObj.draw(ctx, this.MAP_W, this.MAP_H);
    }
    
    this.drawEntities();
    ctx.restore();
    
    // Draw weather effect (overlay)
    if (this.weather === 'rainy') {
      this.drawRain();
    }
    
    this.drawMiniMap();
  }

  private drawRain() {
    const { ctx, canvas } = this;
    
    // Initialize rain drops if empty
    if (this.rainDrops.length === 0) {
      for (let i = 0; i < 200; i++) {
        this.rainDrops.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          len: 10 + Math.random() * 20,
          speed: 8 + Math.random() * 12
        });
      }
    }

    // Draw and update drops
    ctx.save();
    ctx.strokeStyle = 'rgba(174, 194, 224, 0.45)';
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    
    for (const drop of this.rainDrops) {
      // Determine if drop is "outside" based on world Y
      const worldX = drop.x + this.cameraX;
      const worldY = drop.y + this.cameraY;
      let isOutside = true;
      
      // Shop and Cafe have interiors above Y=560 (approx)
      if (this.currentMap === 'shop' || this.currentMap === 'cafe') {
        if (worldY < 560) isOutside = false;
      }
      
      // Samandag sheltered areas
      if (this.currentMap === 'samandag') {
        // Under the seating roof (x: 1600-2050, y: >350)
        if (worldX > 1580 && worldX < 2070 && worldY > 350 && worldY < 540) isOutside = false;
        // Under the buffet roof (x: 2100-2320, y: >330)
        if (worldX > 2080 && worldX < 2340 && worldY > 330 && worldY < 520) isOutside = false;
      }

      if (isOutside) {
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x + 1.5, drop.y + drop.len);
      }
      
      drop.y += drop.speed;
      drop.x += 0.5; // slight drift
      
      if (drop.y > canvas.height) {
        drop.y = -drop.len;
        drop.x = Math.random() * canvas.width;
      }
    }
    ctx.stroke();

    // Rainy tint overlay (Only for outdoor area if possible, or just lighter)
    // To keep it simple and clean, we apply a subtle tint to the whole screen 
    // but the actual drops only appear outside.
    ctx.fillStyle = 'rgba(20, 30, 48, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.restore();
  }

          private drawMiniMap() {
    const { ctx, canvas } = this;
    const padding = 20;
    const mmW = Math.min(220, canvas.width * 0.25);
    const mmH = (mmW / this.MAP_W) * this.MAP_H;
    const mmX = padding;
    const mmY = canvas.height - mmH - padding;
    const scale = mmW / this.MAP_W;

    const mapObj = this.maps.get(this.currentMap);
    if (mapObj) {
      mapObj.drawMiniMap(ctx, mmX, mmY, mmW, mmH, scale);
    }

    // Thirsty plants on mini-map (only show plants that need watering)
    this.plants.forEach(p => {
      if (!p.isWatered && p.isInteractive) {
        const px = mmX + p.x * scale;
        const py = mmY + p.y * scale;
        ctx.save();
        // Orange warning dot
        ctx.fillStyle = 'rgba(251, 140, 0, 0.9)';
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
        // White ring
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.stroke();
        // Droplet icon above the dot
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💧', px, py - 7);
        ctx.restore();
      }
    });

    // Characters on mini-map
    this.customers.forEach(c => {
      ctx.fillStyle = c.selected ? '#00c9a7' : 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(mmX + c.x * scale, mmY + c.y * scale, c.selected ? 4.5 : 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Doctor (red dot with white ring)
    const dx = mmX + this.player.x * scale;
    const dy = mmY + this.player.y * scale;
    ctx.fillStyle = 'rgba(231, 76, 60, 0.3)';
    ctx.beginPath();
    ctx.arc(dx, dy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(dx, dy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(dx, dy, 4, 0, Math.PI * 2);
    ctx.stroke();

    // Viewport box
    ctx.strokeStyle = 'rgba(0, 201, 167, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(
      mmX + this.cameraX * scale,
      mmY + this.cameraY * scale,
      canvas.width * scale,
      canvas.height * scale
    );
  }

      private handleHover(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left + this.cameraX;
    const my = e.clientY - rect.top + this.cameraY;
    const baseScale = Math.max(1.5, this.canvas.height / 450);
    const hitRadius = 40 * baseScale;
    
    let overAny = false;
    // Check customers
    for (const c of this.customers) {
      if (c.selected || (c.state !== 'waiting' && c.state !== 'walking')) continue;
      const dx = mx - c.x, dy = my - c.y;
      if (Math.sqrt(dx * dx + dy * dy) < hitRadius) { overAny = true; break; }
    }
    
        // Check plants
    if (!overAny) {
      for (const p of this.plants) {
        const dx = mx - p.x, dy = my - p.y;
        if (Math.sqrt(dx*dx + dy*dy) < 35) { overAny = true; break; }
      }
    }

    this.canvas.style.cursor = overAny ? 'pointer' : 'default';
  }

        private showPlantPopup(plant: Plant) {
    this.selectedPlant = plant;
    const popup = document.getElementById('plant-popup')!;
    // Fixed position UI now, CSS handles position
    popup.classList.remove('hidden');
  }

  private closePlantPopup() {
    this.selectedPlant = null;
    document.getElementById('plant-popup')!.classList.add('hidden');
  }

      private handleClick(e: MouseEvent) {
    if (this.wasDragging) {
      this.wasDragging = false;
      return;
    }
    if (this.draggingPlant) {
      // Place the plant
      this.draggingPlant = null;
      return;
    }
    if (this.isConsultationOpen) return;
    if (!this.onClickCustomer) return;
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left + this.cameraX;
    const my = e.clientY - rect.top + this.cameraY;
    const baseScale = Math.max(1.5, this.canvas.height / 450);
    const hitRadius = 40 * baseScale;
    
    // Check customer click
    for (const c of this.customers) {
      if (c.selected || (c.state !== 'waiting' && c.state !== 'walking')) continue;
      const dx = mx - c.x, dy = my - c.y;
      if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {
        this.onClickCustomer(c.profile);
        return;
      }
    }
    
    // Check car click
    if (this.playerCar) {
      const dx = mx - this.playerCar.x - 70;
      const dy = my - this.playerCar.y - 30;
      if (Math.abs(dx) < 70 && Math.abs(dy) < 30) {
        this.pendingCarInteraction = true;
        this.player.targetX = this.playerCar.x + 30; 
        this.player.targetY = this.playerCar.y + 70;
        this.targetMarker = { x: mx, y: my, alpha: 1.0, type: 'interact' };
        return;
      }
    }
    
            // Check plant clicks (smaller circular hit box to avoid misclicks)
    for (const p of this.plants) {
      const dx = mx - p.x, dy = my - p.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (p.isInteractive && dist < 35) {
        this.showPlantPopup(p);
        this.targetMarker = { x: mx, y: my, alpha: 1.0, type: 'interact' };
        return;
      }
    }

    // Check Buffet/Cafe Counter click
    if (this.currentMap === 'samandag') {
      const bx = 2100, by = 380, bw = 220, bh = 140;
      if (mx >= bx && mx <= bx + bw && my >= by && my <= by + bh) {
        if (this.onBuffetClick) this.onBuffetClick();
        this.targetMarker = { x: mx, y: my, alpha: 1.0, type: 'interact' };
        return;
      }
    } else if (this.currentMap === 'cafe') {
      const bx = 100, by = 80, bw = 600, bh = 140;
      if (mx >= bx && mx <= bx + bw && my >= by && my <= by + bh) {
        if (this.onBuffetClick) this.onBuffetClick();
        this.targetMarker = { x: mx, y: my, alpha: 1.0, type: 'interact' };
        return;
      }
    } else if (this.currentMap === 'market') {
      const bx = 1600, by = 450, bw = 180, bh = 80;
      if (mx >= bx && mx <= bx + bw && my >= by && my <= by + bh) {
        if (this.onBuffetClick) this.onBuffetClick();
        this.targetMarker = { x: mx, y: my, alpha: 1.0, type: 'interact' };
        return;
      }
    }
    
        // Move Audiologist
    this.closePlantPopup(); // Close menu if moving elsewhere
    this.player.targetX = mx;
    this.player.targetY = my;
    this.targetMarker = { x: mx, y: my, alpha: 1.0, type: 'move' };
    this.player.clickTime = this.time; 
    this.isTracing = false;
    this.followingCustomerId = null;
    this.focusedCustomerId = null; // Unlock camera focus when moving
  }

  public drawMonitor(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = '#0a1520';
    ctx.fillRect(x, y, 90, 60);
    ctx.fillStyle = '#1a3a5c';
    ctx.fillRect(x + 3, y + 3, 84, 54);
    ['#00c9a7', '#4f8ef7', '#f5c518'].forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(x + 8, y + 10 + i * 14, 50 - i * 10, 6);
    });
    ctx.fillStyle = '#1c2230';
    ctx.fillRect(x + 38, y + 60, 14, 10);
    ctx.fillRect(x + 28, y + 68, 34, 4);
  }

  public drawPaper(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = '#d0ccc0';
    ctx.fillRect(x, y, 50, 65);
    ctx.fillStyle = '#aaa';
    for (let i = 0; i < 6; i++) ctx.fillRect(x + 5, y + 10 + i * 9, 40, 3);
  }

  public drawCoffee(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = '#5a3a1a';
    ctx.beginPath(); ctx.ellipse(x + 16, y + 30, 18, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c87941';
    ctx.beginPath(); ctx.ellipse(x + 16, y + 16, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 5);
    ctx.bezierCurveTo(x + 6, y, x + 14, y - 8, x + 10, y - 14);
    ctx.moveTo(x + 16, y + 3);
    ctx.bezierCurveTo(x + 12, y - 2, x + 20, y - 10, x + 16, y - 16);
    ctx.stroke();
  }

  public drawVendingMachine(ctx: CanvasRenderingContext2D, x: number, y: number) {
    // Main body with 3D effect
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(x, y, 75, 150);
    ctx.fillStyle = '#1a252f';
    ctx.fillRect(x + 75, y + 10, 10, 130); // side depth
    
    // Glass display
    const glassGrad = ctx.createLinearGradient(x + 5, y + 5, x + 65, y + 85);
    glassGrad.addColorStop(0, '#1a252f');
    glassGrad.addColorStop(0.5, '#2c3e50');
    glassGrad.addColorStop(1, '#1a252f');
    ctx.fillStyle = glassGrad;
    ctx.fillRect(x + 5, y + 5, 65, 85);
    
    // Snacks with glow
    for(let row=0; row<3; row++) {
      for(let col=0; col<3; col++) {
        ctx.fillStyle = ['#f1c40f', '#e74c3c', '#3498db'][row];
        ctx.shadowBlur = 4; ctx.shadowColor = ctx.fillStyle;
        ctx.fillRect(x + 12 + col * 18, y + 15 + row * 25, 12, 12);
        ctx.shadowBlur = 0;
      }
    }
    
    // Controls
    ctx.fillStyle = '#34495e';
    ctx.fillRect(x + 10, y + 100, 55, 40);
    ctx.fillStyle = '#00c9a7';
    ctx.fillRect(x + 45, y + 105, 12, 12); // coin slot
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(x + 45, y + 122, 12, 12); // change return
  }

  public drawDisplayCase(ctx: CanvasRenderingContext2D, x: number, y: number) {
    // Metal frame
    const frameGrad = ctx.createLinearGradient(x, y, x + 130, y);
    frameGrad.addColorStop(0, '#34495e');
    frameGrad.addColorStop(0.5, '#7f8c8d');
    frameGrad.addColorStop(1, '#34495e');
    ctx.fillStyle = frameGrad;
    ctx.fillRect(x, y, 130, 180);
    
    // Internal glow
    const innerGrad = ctx.createRadialGradient(x + 65, y + 90, 10, x + 65, y + 90, 80);
    innerGrad.addColorStop(0, 'rgba(0, 201, 167, 0.2)');
    innerGrad.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
    ctx.fillStyle = innerGrad;
    ctx.fillRect(x + 8, y + 8, 114, 164);
    
    // Shelves and Aids
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 2;
    for(let i=0; i<4; i++) {
      const sy = y + 10 + i * 40;
      ctx.strokeRect(x + 8, sy, 114, 40);
      
      // Detailed Hearing Aid shapes
      ['#f5c518', '#3498db'].forEach((color, col) => {
        ctx.fillStyle = color;
        const ax = x + 35 + col * 60, ay = sy + 20;
        ctx.beginPath(); ctx.ellipse(ax, ay, 6, 8, 0.5, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
      });
    }
  }

  public drawFilingCabinet(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const cabGrad = ctx.createLinearGradient(x, y, x + 65, y);
    cabGrad.addColorStop(0, '#7f8c8d');
    cabGrad.addColorStop(0.5, '#bdc3c7');
    cabGrad.addColorStop(1, '#7f8c8d');
    ctx.fillStyle = cabGrad;
    ctx.fillRect(x, y, 65, 130);
    
    for(let i=0; i<4; i++) {
      const dy = y + i * 32;
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 2, dy + 2, 61, 28);
      
      // Handle with shine
      ctx.fillStyle = '#2c3e50';
      ctx.fillRect(x + 20, dy + 12, 25, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(x + 20, dy + 12, 25, 1);
  }
}
}
