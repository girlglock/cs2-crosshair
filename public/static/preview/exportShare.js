import { isAnimatedCrosshairStyle } from "./utils.js";
import { MOVEMENT_CYCLE_MS } from "./weaponSimulator.js";

const GIF_FRAME_INTERVAL_MS = 50;

export function copyCode() {
    const code = document.getElementById("crosshairCode").value;
    navigator.clipboard.writeText(code).then(() => {
        alert("code copied :3c");
    }).catch(() => {
        const textArea = document.createElement("textarea");
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        alert("code copied :3c");
    });
}

export async function buildClassicCrosshairGif(settings, weaponSim, crosshairPreviewRenderer) {
    const { GIFEncoder, quantize, applyPalette } = window.gifenc;

    const weapon = weaponSim.selectedWeapon;
    const splitDist = Number(settings.cl_crosshair_dynamic_splitdist);
    const nativeRes = crosshairPreviewRenderer.nativeRes;

    const maxSpread = weaponSim.computeSpreadPixels(weapon.maxSpeed, nativeRes.height, splitDist, false);
    const maxBaseDistanceGoal = weaponSim.computeBaseDistanceGoal(settings, weapon.maxSpeed);
    const maxFrame = crosshairPreviewRenderer.computeFrame(settings, maxSpread, maxBaseDistanceGoal);
    const gifWidth = maxFrame.width;
    const gifHeight = maxFrame.height;

    const scratch = document.createElement("canvas");
    scratch.width = gifWidth;
    scratch.height = gifHeight;
    const scratchCtx = scratch.getContext("2d");
    scratchCtx.imageSmoothingEnabled = false;

    const gif = GIFEncoder();

    for (let t = 0; t < MOVEMENT_CYCLE_MS; t += GIF_FRAME_INTERVAL_MS) {
        const phase = weaponSim.getMovementPhase(t);
        const spreadOverride = weaponSim.computeSpreadPixels(phase.speed, nativeRes.height, splitDist);
        const baseDistanceGoal = weaponSim.computeBaseDistanceGoal(settings, phase.speed);
        const frame = crosshairPreviewRenderer.computeFrame(settings, spreadOverride, baseDistanceGoal);

        scratchCtx.clearRect(0, 0, gifWidth, gifHeight);
        scratchCtx.drawImage(frame.canvas, (gifWidth - frame.width) / 2, (gifHeight - frame.height) / 2);

        const { data } = scratchCtx.getImageData(0, 0, gifWidth, gifHeight);
        const palette = quantize(data, 256, { format: "rgba4444", oneBitAlpha: true });
        let transparentIndex = palette.findIndex(c => c[3] === 0);
        if (transparentIndex === -1) transparentIndex = 0;
        const index = applyPalette(data, palette, "rgba4444");

        gif.writeFrame(index, gifWidth, gifHeight, {
            palette,
            delay: GIF_FRAME_INTERVAL_MS,
            transparent: true,
            transparentIndex
        });
    }

    gif.finish();
    return new Blob([gif.bytes()], { type: "image/gif" });
}

export async function downloadImage(event, settings, weaponSim, crosshairPreviewRenderer) {
    const code = document.getElementById("crosshairCode").value;

    if (!isAnimatedCrosshairStyle(settings)) {
        const canvas = document.getElementById("crosshairCanvas");
        const link = document.createElement("a");
        link.download = code + ".png";
        link.href = canvas.toDataURL();
        link.click();
        return;
    }

    const btn = event && event.currentTarget;
    const originalLabel = btn ? btn.textContent : null;
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Generating...";
    }

    try {
        const blob = await buildClassicCrosshairGif(settings, weaponSim, crosshairPreviewRenderer);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = code + ".gif";
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("failed to generate gif:", error);
        alert("failed to generate gif :c");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = originalLabel;
        }
    }
}

export function shareCrosshair() {
    const code = document.getElementById("crosshairCode").value;
    const url = `${window.location.origin}/${code}`;

    if (navigator.share) {
        navigator.share({
            title: "cs2-crosshair",
            text: "wowie look at this crosshair",
            url: url
        });
    } else {
        navigator.clipboard.writeText(url).then(() => {
            alert("share link copied!");
        }).catch(() => {
            prompt("copy this link to share:", url);
        });
    }
}
