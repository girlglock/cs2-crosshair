import { isAnimatedCrosshairStyle } from "./utils.js";

export class FireTestController {
    constructor(weaponSim, crosshairRenderer, getSettings) {
        this.weaponSim = weaponSim;
        this.crosshairRenderer = crosshairRenderer;
        this.getSettings = getSettings;

        this.movementAnimationHandle = null;
        this.movementAnimationStart = null;

        this.previewHoverActive = false;
        this.previewMouseHeld = false;
        this.fireTestHandle = null;
        this.firePausedSpeed = 0;
        this.resumeElapsedMs = 0;
    }

    isAnimatedStyle() {
        return isAnimatedCrosshairStyle(this.getSettings());
    }

    setMovementSpeedLabel(speed) {
        const label = document.getElementById("movementStateLabel");
        if (label) label.textContent = `${Math.round(speed)} u/s`;
    }

    renderStatic() {
        const settings = this.getSettings();
        this.crosshairRenderer.renderToCanvas(settings, null, this.weaponSim.computeBaseDistanceGoal(settings, 0));
    }

    stopMovementAnimation() {
        if (this.movementAnimationHandle !== null) {
            cancelAnimationFrame(this.movementAnimationHandle);
            this.movementAnimationHandle = null;
        }
        this.movementAnimationStart = null;
        this.setMovementSpeedLabel(0);
    }

    startMovementAnimation(elapsedOffsetMs = 0) {
        this.movementAnimationStart = performance.now() - elapsedOffsetMs;

        const tick = (now) => {
            if (!this.isAnimatedStyle()) {
                this.stopMovementAnimation();
                this.renderStatic();
                return;
            }

            if (this.previewHoverActive) {
                this.movementAnimationHandle = null;
                return;
            }

            const settings = this.getSettings();
            const phase = this.weaponSim.getMovementPhase(now - this.movementAnimationStart);
            this.setMovementSpeedLabel(phase.speed);

            const splitDist = Number(settings.cl_crosshair_dynamic_splitdist);
            const spreadOverride = this.weaponSim.computeSpreadPixels(phase.speed, this.crosshairRenderer.nativeRes.height, splitDist);
            const baseDistanceGoal = this.weaponSim.computeBaseDistanceGoal(settings, phase.speed);

            this.crosshairRenderer.renderToCanvas(settings, spreadOverride, baseDistanceGoal);

            this.movementAnimationHandle = requestAnimationFrame(tick);
        };

        this.movementAnimationHandle = requestAnimationFrame(tick);
    }

    refresh() {
        if (!this.isAnimatedStyle()) {
            this.stopMovementAnimation();
            this.renderStatic();
            return;
        }

        if (this.previewHoverActive) return;
        if (this.movementAnimationHandle !== null) return;

        this.startMovementAnimation(0);
    }

    startFireTestLoop() {
        let lastFrameTime = performance.now();

        const tick = (now) => {
            if (!this.previewHoverActive) return;

            if (!this.isAnimatedStyle()) {
                this.stopFireTestMode();
                this.renderStatic();
                return;
            }

            const settings = this.getSettings();
            const dt = (now - lastFrameTime) / 1000;
            lastFrameTime = now;

            if (this.weaponSim.canFire()) {
                if (this.previewMouseHeld && this.weaponSim.selectedWeapon.fullAuto) {
                    this.weaponSim.attemptFire(now);
                }
                this.weaponSim.decayFirePenalty(dt);
            }

            const splitDist = Number(settings.cl_crosshair_dynamic_splitdist);
            const spreadOverride = this.weaponSim.computeSpreadPixels(this.firePausedSpeed, this.crosshairRenderer.nativeRes.height, splitDist, this.weaponSim.firePenaltyValue);
            const baseDistanceGoal = this.weaponSim.computeBaseDistanceGoal(settings, this.firePausedSpeed);

            this.crosshairRenderer.renderToCanvas(settings, spreadOverride, baseDistanceGoal);

            this.fireTestHandle = requestAnimationFrame(tick);
        };

        this.fireTestHandle = requestAnimationFrame(tick);
    }

    stopFireTestMode() {
        this.previewHoverActive = false;
        this.previewMouseHeld = false;
        if (this.fireTestHandle !== null) {
            cancelAnimationFrame(this.fireTestHandle);
            this.fireTestHandle = null;
        }
    }

    enterPreviewHover() {
        if (!this.isAnimatedStyle()) return;
        if (this.previewHoverActive) return;

        this.previewHoverActive = true;

        if (this.movementAnimationHandle !== null) {
            this.resumeElapsedMs = performance.now() - this.movementAnimationStart;
            cancelAnimationFrame(this.movementAnimationHandle);
            this.movementAnimationHandle = null;
        }

        this.firePausedSpeed = 0;
        this.setMovementSpeedLabel(this.firePausedSpeed);
        this.weaponSim.resetFirePenalty();

        this.startFireTestLoop();
    }

    exitPreviewHover() {
        if (!this.previewHoverActive) return;

        this.stopFireTestMode();

        if (this.isAnimatedStyle()) {
            this.startMovementAnimation(this.resumeElapsedMs);
        }
    }

    setupFireTest(targetEl) {
        if (!targetEl) return;

        targetEl.addEventListener("mouseenter", () => this.enterPreviewHover());
        targetEl.addEventListener("mouseleave", () => this.exitPreviewHover());
        targetEl.addEventListener("mousedown", (e) => {
            if (e.button !== 0 || !this.previewHoverActive) return;
            this.previewMouseHeld = true;
            this.weaponSim.attemptFire(performance.now());
        });
        targetEl.addEventListener("mouseup", (e) => {
            if (e.button !== 0) return;
            this.previewMouseHeld = false;
        });
    }
}
