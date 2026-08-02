import { rgbToHex, isAnimatedCrosshairStyle } from "./utils.js";

const SPLIT_ONLY_CONTROL_IDS = [
    "cl_crosshair_dynamic_splitdist",
    "cl_crosshair_dynamic_splitalpha_innermod",
    "cl_crosshair_dynamic_splitalpha_outermod",
    "cl_crosshair_dynamic_maxdist_splitratio"
];

const SETTINGS_PANEL_DESKTOP_MEDIA = window.matchMedia("(min-width: 860px)");

export class SettingsPanel {
    constructor(containerEl, onControlChange) {
        this.containerEl = containerEl;
        this.onControlChange = onControlChange;
    }

    setupControls() {
        const scope = this.containerEl;

        scope.querySelectorAll("input[type=range]").forEach(input => {
            const valueSpan = document.getElementById(input.id + "_value");
            input.addEventListener("input", () => {
                const value = parseFloat(input.value);
                if (valueSpan) valueSpan.textContent = value;
                this.onControlChange({ [input.id]: value });
            });
        });

        scope.querySelectorAll("input[type=checkbox]").forEach(checkbox => {
            checkbox.addEventListener("change", () => {
                this.onControlChange({ [checkbox.id]: checkbox.checked });
            });
        });

        scope.querySelectorAll("select").forEach(select => {
            if (!select.id.startsWith("cl_")) return;
            const valueSpan = document.getElementById(select.id + "_value");
            select.addEventListener("change", () => {
                const value = parseInt(select.value);
                if (valueSpan) valueSpan.textContent = value;
                this.onControlChange({ [select.id]: value });
            });
        });

        this.setupColorPicker();
    }

    setupColorPicker() {
        const picker = document.getElementById("cl_crosshaircolor_picker");
        if (!picker) return;

        picker.addEventListener("input", () => {
            const hex = picker.value;
            this.onControlChange({
                cl_crosshaircolor_r: parseInt(hex.slice(1, 3), 16),
                cl_crosshaircolor_g: parseInt(hex.slice(3, 5), 16),
                cl_crosshaircolor_b: parseInt(hex.slice(5, 7), 16)
            });
        });
    }

    updateControlsFromSettings(settings) {
        Object.keys(settings).forEach(key => {
            const input = document.getElementById(key);
            const valueSpan = document.getElementById(key + "_value");

            if (input) {
                if (input.type === "range") {
                    input.value = settings[key];
                    if (valueSpan) valueSpan.textContent = settings[key];
                } else if (input.type === "checkbox") {
                    input.checked = settings[key];
                } else if (input.tagName === "SELECT") {
                    input.value = settings[key];
                    if (valueSpan) valueSpan.textContent = settings[key];
                }
            }
        });

        const picker = document.getElementById("cl_crosshaircolor_picker");
        if (picker) {
            picker.value = rgbToHex(settings.cl_crosshaircolor_r, settings.cl_crosshaircolor_g, settings.cl_crosshaircolor_b);
        }
    }

    updateAvailability(settings) {
        const splitEnabled = isAnimatedCrosshairStyle(settings);
        SPLIT_ONLY_CONTROL_IDS.forEach(id => {
            const input = document.getElementById(id);
            if (!input) return;
            input.disabled = !splitEnabled;
            input.closest(".control-group").classList.toggle("control-disabled", !splitEnabled);
        });

        const colorEnabled = parseInt(settings.cl_crosshaircolor) === 5;
        const picker = document.getElementById("cl_crosshaircolor_picker");
        if (picker) {
            picker.disabled = !colorEnabled;
            picker.closest(".control-group").classList.toggle("control-disabled", !colorEnabled);
        }
    }

    syncPanelHeight() {
        const previewGroup = document.querySelector(".layout-preview-group");
        const settingsEl = document.querySelector(".layout-settings");
        if (!previewGroup || !settingsEl) return;

        if (!SETTINGS_PANEL_DESKTOP_MEDIA.matches) {
            settingsEl.style.maxHeight = "";
            return;
        }

        settingsEl.style.maxHeight = "0px";
        settingsEl.style.maxHeight = previewGroup.offsetHeight + "px";
    }

    setupPanelHeightSync() {
        window.addEventListener("resize", () => this.syncPanelHeight());
    }
}
