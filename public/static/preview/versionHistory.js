import { getTimeAgo, hashString, updateUrlParams, isAnimatedCrosshairStyle } from "./utils.js";
import { BACKGROUND_IMAGES } from "./backgroundCycler.js";

const HISTORY_THUMB_SIZE = 96;

export class VersionHistory {
    constructor(rawRenderer, crosshairPreviewRenderer, weaponSim, containerEl, getPlayerColor, backgroundImages = BACKGROUND_IMAGES) {
        this.renderer = rawRenderer;
        this.crosshairPreviewRenderer = crosshairPreviewRenderer;
        this.weaponSim = weaponSim;
        this.containerEl = containerEl;
        this.getPlayerColor = getPlayerColor;
        this.backgroundImages = backgroundImages;

        this.versions = [];
        this.selectedIndex = 0;
        this.animationGeneration = 0;
        this.onSelect = null;
    }

    build(data) {
        if (!data.lastUsedAt || !data.shareCode) {
            this.versions = [];
            return this.versions;
        }

        const list = [{ shareCode: data.shareCode, label: "current", stats: data.stats || null }];

        const uniquePrevious = (data.previous || [])
            .map(ch => ({ ...ch, timeAgo: getTimeAgo(ch.lastUsedAt, true) }))
            .filter((ch, index, arr) => arr.findIndex(item => item.timeAgo === ch.timeAgo) === index);

        uniquePrevious.forEach(ch => {
            if (ch.shareCode) list.push({ shareCode: ch.shareCode, label: ch.timeAgo, stats: ch.stats || null });
        });

        this.versions = list;
        return this.versions;
    }

    resolveInitialIndex() {
        const historyParam = new URLSearchParams(window.location.search).get("history");
        if (historyParam !== null) {
            const idx = parseInt(historyParam, 10);
            if (Number.isInteger(idx) && idx >= 0 && idx < this.versions.length) {
                this.selectedIndex = idx;
            }
        }
        return this.selectedIndex;
    }

    drawThumbnailFrame(canvas, settings, spreadOverride = null, speed = 0) {
        const baseDistanceGoal = this.weaponSim.computeBaseDistanceGoal(settings, speed);
        const frame = this.crosshairPreviewRenderer.computeFrame(settings, spreadOverride, baseDistanceGoal);
        const ctx = canvas.getContext("2d");
        const size = canvas.width;
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(frame.canvas, (size - frame.width) / 2, (size - frame.height) / 2);
    }

    startThumbnailAnimation(canvas, settings, generation) {
        const start = performance.now();
        const splitDist = Number(settings.cl_crosshair_dynamic_splitdist);

        const tick = (now) => {
            if (generation !== this.animationGeneration) return;

            const phase = this.weaponSim.getMovementPhase(now - start);
            const spreadOverride = this.weaponSim.computeSpreadPixels(phase.speed, this.crosshairPreviewRenderer.nativeRes.height, splitDist);
            this.drawThumbnailFrame(canvas, settings, spreadOverride, phase.speed);

            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    render() {
        const container = this.containerEl;
        if (!container) return;

        this.animationGeneration++;
        const generation = this.animationGeneration;

        container.innerHTML = "";

        if (this.versions.length === 0) {
            container.style.display = "none";
            return;
        }
        container.style.display = "";

        this.versions.forEach((version, index) => {
            const isActive = index === this.selectedIndex;
            const settings = this.renderer.parseCode(version.shareCode);

            const cell = document.createElement("div");
            cell.className = "history-item" + (isActive ? " active" : "");
            cell.addEventListener("click", () => this.select(index));

            const thumbBox = document.createElement("div");
            thumbBox.className = "history-thumb";
            if (isActive) thumbBox.style.borderColor = this.getPlayerColor();

            const bg = document.createElement("div");
            bg.className = "history-thumb-bg";
            bg.style.backgroundImage = `url("${this.backgroundImages[hashString(version.shareCode) % this.backgroundImages.length]}")`;
            bg.style.filter = "blur(2px) brightness(75%)";
            thumbBox.appendChild(bg);

            const canvas = document.createElement("canvas");
            canvas.width = HISTORY_THUMB_SIZE;
            canvas.height = HISTORY_THUMB_SIZE;
            thumbBox.appendChild(canvas);
            cell.appendChild(thumbBox);

            if (isAnimatedCrosshairStyle(settings)) {
                this.startThumbnailAnimation(canvas, settings, generation);
            } else {
                this.drawThumbnailFrame(canvas, settings);
            }

            const label = document.createElement("div");
            label.className = "history-label";
            label.textContent = version.label;
            if (isActive) label.style.color = this.getPlayerColor();
            cell.appendChild(label);

            container.appendChild(cell);
        });
    }

    select(index) {
        if (index < 0 || index >= this.versions.length) return;

        this.selectedIndex = index;
        const version = this.versions[index];

        this.render();
        updateUrlParams({ history: index === 0 ? null : String(index) });
        if (this.onSelect) this.onSelect(version, index);
    }
}
