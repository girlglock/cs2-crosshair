const { createCanvas } = require("@napi-rs/canvas");
const { GIFEncoder, quantize, applyPalette } = require("gifenc");
const { WEAPON_PRESETS, ASPECT_RATIO_PRESETS } = require("../public/static/weaponPresets");

const CS_PLAYER_SPEED_DUCK_MODIFIER = 0.34;
const MOVEMENT_CURVE_EXPONENT = 0.25;
const CROSSHAIR_FOV_DEGREES = 90;

const MOVEMENT_STANDING_MS = 1000;
const MOVEMENT_ACCEL_MS = 300;
const MOVEMENT_MOVING_MS = 1000;
const MOVEMENT_DECEL_MS = 300;
const MOVEMENT_CYCLE_MS = MOVEMENT_STANDING_MS + MOVEMENT_ACCEL_MS + MOVEMENT_MOVING_MS + MOVEMENT_DECEL_MS;
const GIF_FRAME_INTERVAL_MS = 50;
const FAST_MOVE_GAP_THRESHOLD = 100;
const FAST_MOVE_GAP_MULTIPLIER = 1.5;
const EMBED_MIN_CANVAS_SIZE = 64;
const EMBED_NATIVE_RES = { width: 1920, height: 1080 };

const DEFAULT_EMBED_WEAPON = WEAPON_PRESETS.find(w => w.name === "AK-47");

function resolveEmbedWeapon(weaponName) {
    if (!weaponName) return DEFAULT_EMBED_WEAPON;
    const matched = WEAPON_PRESETS.find(w => w.name.toLowerCase() === weaponName.toLowerCase());
    return matched || DEFAULT_EMBED_WEAPON;
}

function resolveHorizontalScale(aspectLabel, referenceHeight) {
    if (typeof aspectLabel !== "string") return 1;
    const matched = ASPECT_RATIO_PRESETS.find(a => a.label.toLowerCase() === aspectLabel.toLowerCase());
    if (!matched) return 1;

    const nativeRatio = EMBED_NATIVE_RES.width / EMBED_NATIVE_RES.height;
    if (Math.abs(matched.ratio - nativeRatio) < 0.0001) return 1;

    const gameWidth = Math.round(referenceHeight * matched.ratio);
    return EMBED_NATIVE_RES.width / gameWidth;
}

function computeDistanceGoal(settings, weapon, speed) {
    let goal = settings.cl_crosshairgap_useweaponvalue ? weapon.deployedGap : 4;
    if (parseInt(settings.cl_crosshairstyle) === 2 && speed > FAST_MOVE_GAP_THRESHOLD) {
        goal *= FAST_MOVE_GAP_MULTIPLIER;
    }
    return goal;
}

function computeSpreadPixels(renderer, weapon, speed, referenceHeight, splitDistCvar) {
    if (!weapon) {
        return { distancePixels: 0, isSplit: false, cappedDistancePixels: null };
    }

    const lower = weapon.maxSpeed * CS_PLAYER_SPEED_DUCK_MODIFIER;
    const upper = weapon.maxSpeed * 0.95;
    let scale = (speed - lower) / (upper - lower);
    scale = Math.max(0, Math.min(1, scale));
    scale = Math.pow(scale, MOVEMENT_CURVE_EXPONENT);

    const accuracy = Math.min(1, weapon.standInaccuracy + scale * weapon.moveInaccuracy);
    const halfFovRad = (CROSSHAIR_FOV_DEGREES * Math.PI / 180) / 2;
    const rawSpread = (accuracy * 320) / Math.tan(halfFovRad);

    const yresScale = referenceHeight / 480;
    const distancePixels = renderer.roundToEven(rawSpread * yresScale);
    const isSplit = rawSpread > splitDistCvar;
    const cappedDistancePixels = isSplit ? renderer.roundToEven(splitDistCvar * yresScale) : null;

    return { distancePixels, isSplit, cappedDistancePixels };
}

function getMovementPhase(elapsedMs, weapon) {
    const maxSpeed = weapon.maxSpeed;
    const t = elapsedMs % MOVEMENT_CYCLE_MS;
    let mark = MOVEMENT_STANDING_MS;
    if (t < mark) return { speed: 0 };

    mark += MOVEMENT_ACCEL_MS;
    if (t < mark) {
        const progress = (t - MOVEMENT_STANDING_MS) / MOVEMENT_ACCEL_MS;
        return { speed: progress * maxSpeed };
    }

    mark += MOVEMENT_MOVING_MS;
    if (t < mark) return { speed: maxSpeed };

    const decelStart = MOVEMENT_STANDING_MS + MOVEMENT_ACCEL_MS + MOVEMENT_MOVING_MS;
    const progress = (t - decelStart) / MOVEMENT_DECEL_MS;
    return { speed: (1 - progress) * maxSpeed };
}

function renderCrosshairGif(renderer, settings, referenceHeight = 1080, weaponName = null, aspectLabel = null) {
    const weapon = resolveEmbedWeapon(weaponName);
    const splitDist = Number(settings.cl_crosshair_dynamic_splitdist);
    const horizontalScale = resolveHorizontalScale(aspectLabel, referenceHeight);

    const maxSpread = computeSpreadPixels(renderer, weapon, weapon.maxSpeed, referenceHeight, splitDist);
    const maxCanvas = renderer.renderCrosshair(settings, referenceHeight, maxSpread, computeDistanceGoal(settings, weapon, weapon.maxSpeed), EMBED_MIN_CANVAS_SIZE);
    const gifWidth = Math.max(1, Math.round(maxCanvas.width * horizontalScale));
    const gifHeight = maxCanvas.height;

    const scratch = createCanvas(gifWidth, gifHeight);
    const scratchCtx = scratch.getContext("2d");

    const gif = GIFEncoder();

    for (let t = 0; t < MOVEMENT_CYCLE_MS; t += GIF_FRAME_INTERVAL_MS) {
        const phase = getMovementPhase(t, weapon);
        const spreadOverride = computeSpreadPixels(renderer, weapon, phase.speed, referenceHeight, splitDist);
        const frameCanvas = renderer.renderCrosshair(settings, referenceHeight, spreadOverride, computeDistanceGoal(settings, weapon, phase.speed), EMBED_MIN_CANVAS_SIZE);
        const drawWidth = Math.max(1, Math.round(frameCanvas.width * horizontalScale));

        scratchCtx.clearRect(0, 0, gifWidth, gifHeight);
        scratchCtx.imageSmoothingEnabled = horizontalScale !== 1;
        scratchCtx.drawImage(
            frameCanvas, 0, 0, frameCanvas.width, frameCanvas.height,
            (gifWidth - drawWidth) / 2, (gifHeight - frameCanvas.height) / 2, drawWidth, frameCanvas.height
        );

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

module.exports = { renderCrosshairGif, resolveEmbedWeapon, resolveHorizontalScale, EMBED_MIN_CANVAS_SIZE };
