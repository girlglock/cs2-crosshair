import { updateUrlParams, resizeBilinear, sharpenCanvas } from "./utils.js";

export const PREVIEW_SCALE_OPTIONS = [1, 2, 4, 8];

const SNAP_BACK_TRANSITION = "transform 0.25s ease";
const FOLLOW_EDGE_MARGIN = 10;

function detectNativeResolution() {
    const dpr = window.devicePixelRatio || 1;
    return {
        width: Math.round((window.screen && window.screen.width || 1920) * dpr),
        height: Math.round((window.screen && window.screen.height || 1080) * dpr)
    };
}

function formatRatio(ratio) {
    return `${ratio.toFixed(2)}:1`;
}

export class CrosshairPreviewRenderer {
    constructor(crosshairRenderer, canvasEl, aspectRatioPresets) {
        this.renderer = crosshairRenderer;
        this.canvasEl = canvasEl;
        this.aspectRatioPresets = aspectRatioPresets;

        this.nativeRes = { width: 1920, height: 1080 };
        this.aspectRatioOptions = [];
        this.selectedAspectRatio = null;
        this.previewScale = 1;
    }

    setupAspectRatioSelect(selectEl, onChange) {
        if (!selectEl) return;

        this.nativeRes = detectNativeResolution();
        const nativeRatio = this.nativeRes.width / this.nativeRes.height;

        const hasNativePreset = this.aspectRatioPresets.some(p => Math.abs(p.ratio - nativeRatio) < 0.001);
        this.aspectRatioOptions = hasNativePreset
            ? this.aspectRatioPresets
            : [...this.aspectRatioPresets, { label: formatRatio(nativeRatio), ratio: nativeRatio }]
                .sort((a, b) => a.ratio - b.ratio);

        let nativeIndex = 0;
        this.aspectRatioOptions.forEach((ar, index) => {
            const option = document.createElement("option");
            option.value = String(index);
            const isNative = Math.abs(ar.ratio - nativeRatio) < 0.001;
            if (isNative) nativeIndex = index;
            option.textContent = ar.label;
            selectEl.appendChild(option);
        });

        let initialIndex = nativeIndex;
        const aspectParam = new URLSearchParams(window.location.search).get("aspect");
        if (aspectParam) {
            const matchedIndex = this.aspectRatioOptions.findIndex(ar => ar.label.toLowerCase() === aspectParam.toLowerCase());
            if (matchedIndex !== -1) initialIndex = matchedIndex;
        }

        this.selectedAspectRatio = this.aspectRatioOptions[initialIndex];
        selectEl.value = String(initialIndex);
        selectEl.addEventListener("change", () => {
            const index = parseInt(selectEl.value, 10);
            this.selectedAspectRatio = this.aspectRatioOptions[index];
            onChange();
            updateUrlParams({ aspect: index === nativeIndex ? null : this.selectedAspectRatio.label });
        });
    }

    setupScaleSlider(sliderEl, labelEl, onChange) {
        if (!sliderEl) return;

        sliderEl.value = "0";
        if (labelEl) labelEl.textContent = `${this.previewScale}x`;

        sliderEl.addEventListener("input", () => {
            this.previewScale = PREVIEW_SCALE_OPTIONS[parseInt(sliderEl.value, 10)];
            if (labelEl) labelEl.textContent = `${this.previewScale}x`;
            onChange();
        });
    }

    setupMouseFollow(containerEl) {
        containerEl.addEventListener("mousemove", (e) => {
            const canvas = this.canvasEl;
            const rect = containerEl.getBoundingClientRect();
            const maxOffsetX = Math.max(0, (rect.width - canvas.offsetWidth) / 2 - FOLLOW_EDGE_MARGIN);
            const maxOffsetY = Math.max(0, (rect.height - canvas.offsetHeight) / 2 - FOLLOW_EDGE_MARGIN);
            const dx = Math.max(-maxOffsetX, Math.min(maxOffsetX, e.clientX - (rect.left + rect.width / 2)));
            const dy = Math.max(-maxOffsetY, Math.min(maxOffsetY, e.clientY - (rect.top + rect.height / 2)));

            canvas.style.transition = "none";
            canvas.style.transform = `translate(${dx}px, ${dy}px)`;
        });

        containerEl.addEventListener("mouseleave", () => {
            const canvas = this.canvasEl;
            canvas.style.transition = SNAP_BACK_TRANSITION;
            canvas.style.transform = "translate(0px, 0px)";
        });
    }

    computeFrame(settings, spreadOverride, baseDistanceGoal) {
        const ratio = this.selectedAspectRatio ? this.selectedAspectRatio.ratio : (this.nativeRes.width / this.nativeRes.height);
        const gameRes = { width: Math.round(this.nativeRes.height * ratio), height: this.nativeRes.height };

        const gameRendered = this.renderer.renderCrosshair(settings, gameRes.height, spreadOverride, baseDistanceGoal);
        const intermediateSize = gameRendered.width;

        const horizontalScale = this.nativeRes.width / gameRes.width;
        const finalWidth = Math.max(8, Math.round(intermediateSize * horizontalScale));
        const finalHeight = intermediateSize;

        let resultCanvas = gameRendered;
        if (finalWidth !== intermediateSize) {
            resultCanvas = resizeBilinear(gameRendered, finalWidth, finalHeight);
            sharpenCanvas(resultCanvas);
        }

        return { canvas: resultCanvas, width: finalWidth, height: finalHeight };
    }

    renderToCanvas(settings, spreadOverride, baseDistanceGoal) {
        const canvas = this.canvasEl;
        const ctx = canvas.getContext("2d");

        const frame = this.computeFrame(settings, spreadOverride, baseDistanceGoal);

        canvas.width = frame.width;
        canvas.height = frame.height;
        canvas.style.width = (frame.width * this.previewScale) + "px";
        canvas.style.height = (frame.height * this.previewScale) + "px";
        ctx.imageSmoothingEnabled = false;
        ctx.clearRect(0, 0, frame.width, frame.height);
        ctx.drawImage(frame.canvas, 0, 0);
    }
}
