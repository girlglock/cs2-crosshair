const { createCanvas } = require("@napi-rs/canvas");
const { GIFEncoder, quantize, applyPalette } = require("gifenc");

const CS_PLAYER_SPEED_RUN = 260;
const CS_PLAYER_SPEED_DUCK_MODIFIER = 0.34;
const MOVEMENT_CURVE_EXPONENT = 0.25;
const CROSSHAIR_FOV_DEGREES = 90;

const MOVEMENT_STANDING_MS = 1000;
const MOVEMENT_ACCEL_MS = 300;
const MOVEMENT_MOVING_MS = 1000;
const MOVEMENT_DECEL_MS = 300;
const MOVEMENT_CYCLE_MS = MOVEMENT_STANDING_MS + MOVEMENT_ACCEL_MS + MOVEMENT_MOVING_MS + MOVEMENT_DECEL_MS;
const GIF_FRAME_INTERVAL_MS = 50;

const EMBED_WEAPON = { moveInaccuracy: 0.045, deployedGap: 5 };

function computeSpreadPixels(renderer, weapon, speed, referenceHeight, splitDistCvar) {
    if (!weapon || speed <= 0) {
        return { distancePixels: 0, isSplit: false, cappedDistancePixels: null };
    }

    const lower = CS_PLAYER_SPEED_RUN * CS_PLAYER_SPEED_DUCK_MODIFIER;
    const upper = CS_PLAYER_SPEED_RUN * 0.95;
    let scale = (speed - lower) / (upper - lower);
    scale = Math.max(0, Math.min(1, scale));
    scale = Math.pow(scale, MOVEMENT_CURVE_EXPONENT);

    const accuracy = Math.min(1, scale * weapon.moveInaccuracy);
    const halfFovRad = (CROSSHAIR_FOV_DEGREES * Math.PI / 180) / 2;
    const rawSpread = (accuracy * 320) / Math.tan(halfFovRad);

    const yresScale = referenceHeight / 480;
    const distancePixels = renderer.roundToEven(rawSpread * yresScale);
    const isSplit = rawSpread > splitDistCvar;
    const cappedDistancePixels = isSplit ? renderer.roundToEven(splitDistCvar * yresScale) : null;

    return { distancePixels, isSplit, cappedDistancePixels };
}

function getMovementSpeed(elapsedMs) {
    const t = elapsedMs % MOVEMENT_CYCLE_MS;
    let mark = MOVEMENT_STANDING_MS;
    if (t < mark) return 0;

    mark += MOVEMENT_ACCEL_MS;
    if (t < mark) {
        const progress = (t - MOVEMENT_STANDING_MS) / MOVEMENT_ACCEL_MS;
        return progress * CS_PLAYER_SPEED_RUN;
    }

    mark += MOVEMENT_MOVING_MS;
    if (t < mark) return CS_PLAYER_SPEED_RUN;

    const decelStart = MOVEMENT_STANDING_MS + MOVEMENT_ACCEL_MS + MOVEMENT_MOVING_MS;
    const progress = (t - decelStart) / MOVEMENT_DECEL_MS;
    return (1 - progress) * CS_PLAYER_SPEED_RUN;
}

function renderCrosshairGif(renderer, settings, referenceHeight = 1080) {
    const splitDist = Number(settings.cl_crosshair_dynamic_splitdist);
    const baseDistanceGoal = settings.cl_crosshairgap_useweaponvalue ? EMBED_WEAPON.deployedGap : 4;

    const maxSpread = computeSpreadPixels(renderer, EMBED_WEAPON, CS_PLAYER_SPEED_RUN, referenceHeight, splitDist);
    const maxCanvas = renderer.renderCrosshair(settings, referenceHeight, maxSpread, baseDistanceGoal);
    const gifWidth = maxCanvas.width;
    const gifHeight = maxCanvas.height;

    const scratch = createCanvas(gifWidth, gifHeight);
    const scratchCtx = scratch.getContext("2d");
    scratchCtx.imageSmoothingEnabled = false;

    const gif = GIFEncoder();

    for (let t = 0; t < MOVEMENT_CYCLE_MS; t += GIF_FRAME_INTERVAL_MS) {
        const speed = getMovementSpeed(t);
        const spreadOverride = computeSpreadPixels(renderer, EMBED_WEAPON, speed, referenceHeight, splitDist);
        const frameCanvas = renderer.renderCrosshair(settings, referenceHeight, spreadOverride, baseDistanceGoal);

        scratchCtx.clearRect(0, 0, gifWidth, gifHeight);
        scratchCtx.drawImage(frameCanvas, (gifWidth - frameCanvas.width) / 2, (gifHeight - frameCanvas.height) / 2);

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
    return Buffer.from(gif.bytes());
}

module.exports = { renderCrosshairGif };
