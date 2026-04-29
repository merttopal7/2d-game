export class TravelUI {
    private overlay: HTMLElement;
    private onTravel: (destination: string) => void;
    private onClose?: () => void;

    constructor(onTravel: (destination: string) => void, onClose?: () => void) {
        this.onTravel = onTravel;
        this.onClose = onClose;
        this.overlay = document.createElement('div');
        this.overlay.id = 'travel-popup';
        this.overlay.className = 'ui-overlay hidden';
        this.overlay.innerHTML = `
            <div class="travel-content animate-pop">
                <h2>Seyahat Et</h2>
                <p>Nereye gitmek istersin?</p>
                <div class="travel-options">
                    <button class="travel-btn active" data-dest="shop">
                        <span class="icon">🏥</span>
                        <div class="info">
                            <span class="name">Sona İşitme</span>
                            <span class="desc">Senin Merkezin</span>
                        </div>
                    </button>
                    <button class="travel-btn" data-dest="cafe">
                        <span class="icon">☕</span>
                        <div class="info">
                            <span class="name">Starbucks</span>
                            <span class="desc">Kahve Molası</span>
                        </div>
                    </button>
                    <button class="travel-btn disabled" data-dest="home">
                        <span class="icon">🏠</span>
                        <div class="info">
                            <span class="name">Ev</span>
                            <span class="desc">Yakında</span>
                        </div>
                    </button>
                </div>
                <button id="btn-close-travel" class="btn-secondary">Vazgeç</button>
            </div>
        `;
        document.body.appendChild(this.overlay);

        this.overlay.querySelector('#btn-close-travel')?.addEventListener('click', () => {
            this.hide();
            if (this.onClose) this.onClose();
        });
        
        this.overlay.querySelectorAll('.travel-btn:not(.disabled)').forEach(btn => {
            btn.addEventListener('click', () => {
                const dest = (btn as HTMLElement).dataset.dest;
                if (dest) {
                    this.onTravel(dest);
                    this.hide();
                }
            });
        });
    }

    show() {
        this.overlay.classList.remove('hidden');
    }

    hide() {
        this.overlay.classList.add('hidden');
    }
}
