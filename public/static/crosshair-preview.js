import { WeaponSimulator } from "./preview/weaponSimulator.js";
import { CrosshairPreviewRenderer } from "./preview/crosshairPreviewRenderer.js";
import { BackgroundCycler } from "./preview/backgroundCycler.js";
import { FireTestController } from "./preview/fireTestController.js";
import { VersionHistory } from "./preview/versionHistory.js";
import { renderPlayerInfo, renderStats } from "./preview/playerInfo.js";
import { PlayerAutocomplete } from "./preview/playerSearch.js";
import { SettingsPanel } from "./preview/settingsPanel.js";
import { initWindowDrag, initThemeToggle } from "./preview/windowChrome.js";
import { copyCode, downloadImage, shareCrosshair } from "./preview/exportShare.js";

const DEFAULT_SHARE_CODE = "CSGO-cXRt7-URURp-wo2kd-n4VTi-oTc3K";

const renderer = new CS2CrosshairRenderer();

let originalCode = DEFAULT_SHARE_CODE;
let originalSettings = null;
let currentSettings = null;
let playerNickname = "";
let playerColorRGB = null;

function readCrosshairData() {
    const dataEl = document.getElementById("crosshair-data");
    if (!dataEl) return {};
    try {
        return JSON.parse(dataEl.textContent);
    } catch (error) {
        console.error("failed to parse crosshair data payload:", error);
        return {};
    }
}

const crosshairPreviewRenderer = new CrosshairPreviewRenderer(
    renderer,
    document.getElementById("crosshairCanvas"),
    ASPECT_RATIO_PRESETS
);
const weaponSim = new WeaponSimulator(renderer, WEAPON_PRESETS, "AK-47");
const fireTestController = new FireTestController(weaponSim, crosshairPreviewRenderer, () => currentSettings);
const backgroundCycler = new BackgroundCycler(document.getElementById("crosshairBg"));
const versionHistory = new VersionHistory(
    renderer,
    crosshairPreviewRenderer,
    weaponSim,
    document.getElementById("versionHistory"),
    () => playerColorRGB
);
const playerSearch = new PlayerAutocomplete();
const settingsPanel = new SettingsPanel(document.getElementById("settingsPanel"), handleControlChange);

function refreshPreview() {
    settingsPanel.updateAvailability(currentSettings);
    fireTestController.refresh();
}

function refreshBackgroundStretch() {
    const ratio = crosshairPreviewRenderer.selectedAspectRatio
        ? crosshairPreviewRenderer.selectedAspectRatio.ratio
        : (crosshairPreviewRenderer.nativeRes.width / crosshairPreviewRenderer.nativeRes.height);
    backgroundCycler.updateStretch(ratio, crosshairPreviewRenderer.nativeRes);
}

function updateCrosshair() {
    refreshPreview();
    document.getElementById("crosshairCode").value = renderer.generateCode(currentSettings);
}

function handleControlChange(updates) {
    Object.assign(currentSettings, updates);
    updateCrosshair();
}

versionHistory.onSelect = (version, index) => {
    currentSettings = renderer.parseCode(version.shareCode);
    settingsPanel.updateControlsFromSettings(currentSettings);
    refreshPreview();
    document.getElementById("crosshairCode").value = version.shareCode;
    renderStats({ nickname: playerNickname, stats: version.stats });
};

document.addEventListener("DOMContentLoaded", function () {
    const data = readCrosshairData();

    originalCode = data.shareCode || DEFAULT_SHARE_CODE;
    originalSettings = renderer.parseCode(originalCode);
    currentSettings = { ...originalSettings };
    playerNickname = data.nickname || "";

    document.getElementById("crosshairCode").value = originalCode;

    const [r, g, b] = renderer.getColor(originalSettings);
    playerColorRGB = `rgb(${r}, ${g}, ${b})`;
    renderPlayerInfo(data, playerColorRGB);
    renderStats(data);

    versionHistory.build(data);
    const initialIndex = versionHistory.resolveInitialIndex();

    if (initialIndex !== 0) {
        const version = versionHistory.versions[initialIndex];
        originalCode = version.shareCode;
        originalSettings = renderer.parseCode(originalCode);
        currentSettings = { ...originalSettings };
        document.getElementById("crosshairCode").value = originalCode;
        renderStats({ nickname: playerNickname, stats: version.stats });
    }

    settingsPanel.setupControls();
    crosshairPreviewRenderer.setupAspectRatioSelect(document.getElementById("aspectRatioSelect"), () => {
        refreshPreview();
        refreshBackgroundStretch();
    });
    weaponSim.setupSelect(document.getElementById("weaponSelect"), () => refreshPreview());
    crosshairPreviewRenderer.setupScaleSlider(
        document.getElementById("previewScaleSlider"),
        document.getElementById("previewScaleLabel"),
        () => refreshPreview()
    );
    fireTestController.setupFireTest(document.getElementById("crosshairImage"));
    crosshairPreviewRenderer.setupMouseFollow(document.getElementById("crosshairImage"));
    backgroundCycler.setupHoverPause(document.getElementById("crosshairImage"));

    versionHistory.render();
    settingsPanel.updateControlsFromSettings(currentSettings);
    refreshPreview();

    backgroundCycler.update();
    refreshBackgroundStretch();
    backgroundCycler.start();

    settingsPanel.setupPanelHeightSync();
    settingsPanel.syncPanelHeight();

    playerSearch.setup();
    playerSearch.loadProPlayersData();

    initThemeToggle();
    initWindowDrag();

    document.getElementById("searchButton").addEventListener("click", () => playerSearch.goToSearch());
    document.getElementById("copyButton").addEventListener("click", copyCode);
    document.getElementById("saveButton").addEventListener("click", (event) => {
        downloadImage(event, currentSettings, weaponSim, crosshairPreviewRenderer);
    });
    document.getElementById("shareButton").addEventListener("click", shareCrosshair);
    document.getElementById("prevBackgroundButton").addEventListener("click", () => backgroundCycler.retreat());
    document.getElementById("nextBackgroundButton").addEventListener("click", () => backgroundCycler.advance());
});
