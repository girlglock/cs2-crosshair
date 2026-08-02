import { updateUrlParams } from "./utils.js";

export const CS_PLAYER_SPEED_DUCK_MODIFIER = 0.34;
export const MOVEMENT_CURVE_EXPONENT = 0.25;
export const CROSSHAIR_FOV_DEGREES = 90;
export const FAST_MOVE_GAP_THRESHOLD = 100;
export const FAST_MOVE_GAP_MULTIPLIER = 1.5;

export const MOVEMENT_STANDING_MS = 1000;
export const MOVEMENT_ACCEL_MS = 300;
export const MOVEMENT_MOVING_MS = 1000;
export const MOVEMENT_DECEL_MS = 300;
export const MOVEMENT_CYCLE_MS = MOVEMENT_STANDING_MS + MOVEMENT_ACCEL_MS + MOVEMENT_MOVING_MS + MOVEMENT_DECEL_MS;

export class WeaponSimulator {
    constructor(renderer, weaponPresets, defaultWeaponName = "AK-47") {
        this.renderer = renderer;
        this.weaponPresets = weaponPresets;
        this.defaultWeaponName = (weaponPresets.find(w => w.name === defaultWeaponName) || weaponPresets[0]).name;
        this.selectedWeapon = weaponPresets.find(w => w.name === defaultWeaponName) || weaponPresets[0];

        this.firePenaltyValue = 0;
        this.lastShotTime = -Infinity;
    }

    selectByName(name) {
        const matched = this.weaponPresets.find(w => w.name.toLowerCase() === name.toLowerCase());
        if (matched) this.selectedWeapon = matched;
        return matched;
    }

    setupSelect(selectEl, onChange) {
        if (!selectEl) return;

        const categories = [...new Set(this.weaponPresets.map(w => w.category))];
        categories.forEach(category => {
            const group = document.createElement("optgroup");
            group.label = category;
            this.weaponPresets.filter(w => w.category === category).forEach(weapon => {
                const option = document.createElement("option");
                option.value = weapon.name;
                option.textContent = weapon.name;
                group.appendChild(option);
            });
            selectEl.appendChild(group);
        });

        const weaponParam = new URLSearchParams(window.location.search).get("weapon");
        if (weaponParam) this.selectByName(weaponParam);

        selectEl.value = this.selectedWeapon.name;
        selectEl.addEventListener("change", () => {
            this.selectedWeapon = this.weaponPresets.find(w => w.name === selectEl.value) || this.selectedWeapon;
            onChange();
            updateUrlParams({ weapon: this.selectedWeapon.name === this.defaultWeaponName ? null : this.selectedWeapon.name });
        });
    }

    computeSpreadPixels(speed, referenceHeight, splitDistCvar, baselineOverride = null) {
        const weapon = this.selectedWeapon;
        if (!weapon) {
            return { distancePixels: 0, isSplit: false, cappedDistancePixels: null };
        }

        const lower = weapon.maxSpeed * CS_PLAYER_SPEED_DUCK_MODIFIER;
        const upper = weapon.maxSpeed * 0.95;
        let scale = (speed - lower) / (upper - lower);
        scale = Math.max(0, Math.min(1, scale));
        scale = Math.pow(scale, MOVEMENT_CURVE_EXPONENT);

        const baseline = baselineOverride !== null ? baselineOverride : weapon.standInaccuracy;
        const accuracy = Math.min(1, baseline + scale * weapon.moveInaccuracy);

        const halfFovRad = (CROSSHAIR_FOV_DEGREES * Math.PI / 180) / 2;
        const rawSpread = (accuracy * 320) / Math.tan(halfFovRad);

        const yresScale = referenceHeight / 480;
        const distancePixels = this.renderer.roundToEven(rawSpread * yresScale);

        const isSplit = rawSpread > splitDistCvar;
        const cappedDistancePixels = isSplit ? this.renderer.roundToEven(splitDistCvar * yresScale) : null;

        return { distancePixels, isSplit, cappedDistancePixels };
    }

    getMovementPhase(elapsedMs) {
        const weapon = this.selectedWeapon;
        const maxSpeed = weapon.maxSpeed;
        const t = elapsedMs % MOVEMENT_CYCLE_MS;
        let mark = MOVEMENT_STANDING_MS;

        if (t < mark) {
            return { label: "Standing", speed: 0 };
        }
        mark += MOVEMENT_ACCEL_MS;
        if (t < mark) {
            const progress = (t - MOVEMENT_STANDING_MS) / MOVEMENT_ACCEL_MS;
            return { label: "Accelerating", speed: progress * maxSpeed };
        }
        mark += MOVEMENT_MOVING_MS;
        if (t < mark) {
            return { label: "Moving (full speed)", speed: maxSpeed };
        }
        const decelStart = MOVEMENT_STANDING_MS + MOVEMENT_ACCEL_MS + MOVEMENT_MOVING_MS;
        const progress = (t - decelStart) / MOVEMENT_DECEL_MS;
        return { label: "Stopping", speed: (1 - progress) * maxSpeed };
    }

    computeBaseDistanceGoal(settings, speed) {
        let baseDistanceGoal = settings.cl_crosshairgap_useweaponvalue ? this.selectedWeapon.deployedGap : 4;
        if (parseInt(settings.cl_crosshairstyle) === 2 && speed > FAST_MOVE_GAP_THRESHOLD) {
            baseDistanceGoal *= FAST_MOVE_GAP_MULTIPLIER;
        }
        return baseDistanceGoal;
    }

    canFire() {
        const weapon = this.selectedWeapon;
        return !!weapon && weapon.cycleTime > 0;
    }

    attemptFire(now) {
        if (!this.canFire()) return;
        const weapon = this.selectedWeapon;
        if (now - this.lastShotTime < weapon.cycleTime * 1000) return;

        this.lastShotTime = now;
        this.firePenaltyValue += weapon.fireInaccuracy;
    }

    resetFirePenalty() {
        this.firePenaltyValue = this.selectedWeapon ? this.selectedWeapon.standInaccuracy : 0;
        this.lastShotTime = -Infinity;
    }

    decayFirePenalty(dt) {
        if (!this.canFire()) return;
        const weapon = this.selectedWeapon;
        const decayFactor = Math.log(10) / weapon.recoveryTimeStand;
        this.firePenaltyValue = weapon.standInaccuracy + (this.firePenaltyValue - weapon.standInaccuracy) * Math.exp(-decayFactor * dt);
    }
}
