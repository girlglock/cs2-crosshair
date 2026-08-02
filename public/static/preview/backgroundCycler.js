const BACKGROUND_DIR = "/static/assets/panorama/images/map_icons/screenshots/1080p/";
const BACKGROUND_NAMES = [
    "de_ancient_png.png",
    "de_anubis_png.png",
    "de_cache_png.png",
    "de_dust2_png.png",
    "de_inferno_png.png",
    "de_mirage_png.png",
    "de_nuke_png.png",
    "de_overpass_png.png",
    "de_train_png.png",
    "de_vertigo_png.png"
];

export const BACKGROUND_IMAGES = BACKGROUND_NAMES.map(name => BACKGROUND_DIR + name);

const BACKGROUND_CYCLE_MS = 5000;

export class BackgroundCycler {
    constructor(bgEl, images = BACKGROUND_IMAGES) {
        this.bgEl = bgEl;
        this.images = images;
        this.currentIndex = 0;
        this.shuffleQueue = [];
        this.history = [0];
        this.historyPos = 0;
        this.cycleHandle = null;
    }

    update() {
        const imageUrl = this.images[this.currentIndex];
        const testImg = new Image();
        testImg.onload = () => {
            this.bgEl.style.backgroundImage = `url("${imageUrl}")`;
        };
        testImg.onerror = () => {
            console.error("failed to load image:", imageUrl);
            this.bgEl.style.backgroundImage = `url("${this.images[0]}")`;
        };
        testImg.src = imageUrl;
    }

    refillShuffleQueue(avoidIndex) {
        const indices = this.images.map((_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        if (indices.length > 1 && indices[0] === avoidIndex) {
            [indices[0], indices[1]] = [indices[1], indices[0]];
        }
        this.shuffleQueue = indices;
    }

    advance() {
        if (this.historyPos < this.history.length - 1) {
            this.historyPos++;
        } else {
            if (this.shuffleQueue.length === 0) this.refillShuffleQueue(this.currentIndex);
            this.history.push(this.shuffleQueue.shift());
            this.historyPos = this.history.length - 1;
        }
        this.currentIndex = this.history[this.historyPos];
        this.update();
    }

    retreat() {
        if (this.historyPos === 0) return;
        this.historyPos--;
        this.currentIndex = this.history[this.historyPos];
        this.update();
    }

    start() {
        if (this.cycleHandle !== null) return;
        this.cycleHandle = setInterval(() => this.advance(), BACKGROUND_CYCLE_MS);
    }

    stop() {
        if (this.cycleHandle !== null) {
            clearInterval(this.cycleHandle);
            this.cycleHandle = null;
        }
    }

    setupHoverPause(containerEl) {
        containerEl.addEventListener("mouseenter", () => this.stop());
        containerEl.addEventListener("mouseleave", () => this.start());
    }

    updateStretch(ratio, nativeRes) {
        const gameWidth = Math.round(nativeRes.height * ratio);
        const horizontalScale = nativeRes.width / gameWidth;
        this.bgEl.style.transform = `scaleX(${horizontalScale})`;
    }
}
