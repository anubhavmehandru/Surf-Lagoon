// Thin wrapper around the DOM overlay so the game logic never touches the DOM
// directly. Keeps rendering concerns out of the gameplay modules.
export class HUD {
    constructor() {
        this.start = document.getElementById('start');
        this.hud = document.getElementById('hud');
        this.gemEl = document.getElementById('gems');
        this.timeEl = document.getElementById('time');
        this.banner = document.getElementById('banner');
    }

    showStart() {
        if (this.start) this.start.style.display = 'flex';
        if (this.hud) this.hud.style.display = 'none';
    }

    hideStart() {
        if (this.start) this.start.style.display = 'none';
        if (this.hud) this.hud.style.display = 'block';
    }

    setGems(collected, total) {
        if (this.gemEl) this.gemEl.textContent = `💎 ${collected} / ${total}`;
    }

    setTime(seconds) {
        if (this.timeEl) this.timeEl.textContent = `⏱ ${seconds.toFixed(1)}s`;
    }

    showBanner(text) {
        if (!this.banner) return;
        this.banner.textContent = text;
        this.banner.style.display = 'block';
    }

    hideBanner() {
        if (this.banner) this.banner.style.display = 'none';
    }
}
