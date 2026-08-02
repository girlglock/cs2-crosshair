const DEFAULT_SHARE_CODE = "CSGO-cXRt7-URURp-wo2kd-n4VTi-oTc3K";

let renderer = new CS2CrosshairRenderer();
let originalCode = DEFAULT_SHARE_CODE;
let originalSettings = null;
let currentSettings = null;
let proPlayersData = null;
let selectedAutocompleteIndex = -1;
let versions = [];
let selectedVersionIndex = 0;
let playerColorRGB = null;
let playerNickname = "";

function updateUrlParams(updates) {
    const url = new URL(window.location.href);
    Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined) {
            url.searchParams.delete(key);
        } else {
            url.searchParams.set(key, value);
        }
    });
    history.replaceState(null, "", url.pathname + url.search + url.hash);
}

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

function complementaryGrayscale(rgbString) {
    const match = rgbString.match(/\d+/g);
    if (!match) return "rgb(128, 128, 128)";
    const [r, g, b] = match.map(Number);
    const invR = 255 - r, invG = 255 - g, invB = 255 - b;
    const gray = Math.round(0.299 * invR + 0.587 * invG + 0.114 * invB);
    return `rgb(${gray}, ${gray}, ${gray})`;
}

function createIconLink(href, imgSrc, linkStyle) {
    const iconStyle = "width: 18px; height: 18px; margin-right: 2px; filter: grayscale(1);";
    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.style.cssText = linkStyle || "";
    const img = document.createElement("img");
    img.src = imgSrc;
    img.style.cssText = iconStyle;
    a.appendChild(img);
    return a;
}

function renderPlayerInfo(data, colorRGB) {
    const container = document.getElementById("playerInfo");
    container.innerHTML = "";

    if (!data.nickname) return;

    const isLeetify = !data.steamId64;

    const span = document.createElement("span");
    span.style.textDecoration = "none";
    span.style.color = colorRGB;
    span.style.textShadow = `1px 1px 0 ${complementaryGrayscale(colorRGB)}`;
    span.style.display = "inline-flex";
    span.style.alignItems = "center";

    if (!isLeetify) {
        span.appendChild(createIconLink(`https://csstats.gg/player/${data.steamId64}`, "/static/assets/icons/csstats-icon.svg"));
    }

    span.appendChild(createIconLink(
        isLeetify ? `https://leetify.com/@${data.nickname}` : `https://leetify.com/public/profile/${data.steamId64}`,
        "/static/assets/icons/leetify-icon.svg",
        "margin-right: 1px;"
    ));

    if (!isLeetify) {
        span.appendChild(createIconLink(
            `https://steamcommunity.com/profiles/${data.steamId64}`,
            "/static/assets/icons/steam-icon.png",
            "margin-right: 1px;"
        ));
    }

    const nameSpan = document.createElement("span");
    nameSpan.style.marginLeft = "1px";
    nameSpan.textContent = ` • ${data.nickname}${data.cs2Hours ? ` • ${data.cs2Hours}` : ""}`;
    span.appendChild(nameSpan);

    container.appendChild(span);
}

function renderStats(data) {
    const container = document.getElementById("statsInfo");
    container.innerHTML = "";

    const stats = data.stats;
    if (!stats) return;

    const statIconStyle = "width: 15px; height: 15px; margin-right: 2px; vertical-align: -3px;";
    const matchCount = stats.wins + stats.losses;

    const title = document.createElement("div");
    title.style.fontSize = "0.8em";
    title.textContent = `${data.nickname}'s stats with this crosshair:`;
    container.appendChild(title);

    const line = document.createElement("div");

    const matchSpan = document.createElement("span");
    matchSpan.title = "Games Played";
    matchSpan.textContent = `${matchCount} Match${matchCount === 1 ? "" : "es"}`;
    line.appendChild(matchSpan);
    line.appendChild(document.createTextNode(" • "));

    const wrIcon = document.createElement("img");
    wrIcon.src = "/static/assets/icons/wr-icon.png";
    wrIcon.style.cssText = statIconStyle;
    line.appendChild(wrIcon);
    line.appendChild(document.createTextNode(` ${(stats.winRate * 100).toFixed(0)}% • `));

    const kdSpan = document.createElement("span");
    kdSpan.title = "K/D Ratio";
    kdSpan.textContent = `K/D ${stats.kdRatio}`;
    line.appendChild(kdSpan);
    line.appendChild(document.createTextNode(" • "));

    const adrSpan = document.createElement("span");
    adrSpan.title = "Average Damage per Round";
    adrSpan.textContent = `ADR ${stats.adr}`;
    line.appendChild(adrSpan);
    line.appendChild(document.createTextNode(" • "));

    const hsIcon = document.createElement("img");
    hsIcon.src = "/static/assets/icons/hs-icon.png";
    hsIcon.style.cssText = statIconStyle;
    line.appendChild(hsIcon);
    line.appendChild(document.createTextNode(` ${(stats.headshotPercentage * 100).toFixed(0)}%`));

    container.appendChild(line);
}

function getTimeAgo(dateString, forceDays = false) {
    if (!dateString) return "";

    try {
        const now = new Date();
        const past = new Date(dateString);
        const diffMs = now - past;

        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);
        const diffMonths = Math.floor(diffDays / 30);
        const diffYears = Math.floor(diffDays / 365);

        if (forceDays && diffDays >= 1) {
            return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
        }

        if (diffSeconds < 60) {
            return diffSeconds <= 1 ? "just now" : `${diffSeconds} seconds ago`;
        } else if (diffMinutes < 60) {
            return diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`;
        } else if (diffHours < 24) {
            return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
        } else if (diffDays < 30) {
            return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
        } else if (diffMonths < 12) {
            return diffMonths === 1 ? "1 month ago" : `${diffMonths} months ago`;
        } else {
            return diffYears === 1 ? "1 year ago" : `${diffYears} years ago`;
        }
    } catch (error) {
        console.error("error parsing date:", error);
        return "";
    }
}

function buildVersionList(data) {
    if (!data.lastUsedAt || !data.shareCode) return [];

    const list = [{ shareCode: data.shareCode, label: "current", stats: data.stats || null }];

    const uniquePrevious = (data.previous || [])
        .map(ch => ({ ...ch, timeAgo: getTimeAgo(ch.lastUsedAt, true) }))
        .filter((ch, index, arr) => arr.findIndex(item => item.timeAgo === ch.timeAgo) === index);

    uniquePrevious.forEach(ch => {
        if (ch.shareCode) list.push({ shareCode: ch.shareCode, label: ch.timeAgo, stats: ch.stats || null });
    });

    return list;
}

const HISTORY_THUMB_SIZE = 96;
let historyAnimationGeneration = 0;

function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}

function drawThumbnailFrame(canvas, settings, spreadOverride = null, speed = 0) {
    const frame = computeCrosshairFrame(settings, spreadOverride, speed);
    const ctx = canvas.getContext("2d");
    const size = canvas.width;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(frame.canvas, (size - frame.width) / 2, (size - frame.height) / 2);
}

function startThumbnailAnimation(canvas, settings, generation) {
    const start = performance.now();
    const splitDist = Number(settings.cl_crosshair_dynamic_splitdist);

    const tick = (now) => {
        if (generation !== historyAnimationGeneration) return;

        const phase = getMovementPhase(now - start, selectedWeapon);
        const spreadOverride = computeSpreadPixels(selectedWeapon, phase.speed, nativeRes.height, splitDist);
        drawThumbnailFrame(canvas, settings, spreadOverride, phase.speed);

        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}

function renderVersionHistory() {
    const container = document.getElementById("versionHistory");
    if (!container) return;

    historyAnimationGeneration++;
    const generation = historyAnimationGeneration;

    container.innerHTML = "";

    if (versions.length === 0) {
        container.style.display = "none";
        return;
    }
    container.style.display = "";

    versions.forEach((version, index) => {
        const isActive = index === selectedVersionIndex;
        const settings = renderer.parseCode(version.shareCode);

        const cell = document.createElement("div");
        cell.className = "history-item" + (isActive ? " active" : "");
        cell.addEventListener("click", () => selectVersion(index));

        const thumbBox = document.createElement("div");
        thumbBox.className = "history-thumb";
        if (isActive) thumbBox.style.borderColor = playerColorRGB;

        const bg = document.createElement("div");
        bg.className = "history-thumb-bg";
        bg.style.backgroundImage = `url("${backgrounds[hashString(version.shareCode) % backgrounds.length]}")`;
        bg.style.filter = "blur(2px) brightness(75%)";
        thumbBox.appendChild(bg);

        const canvas = document.createElement("canvas");
        canvas.width = HISTORY_THUMB_SIZE;
        canvas.height = HISTORY_THUMB_SIZE;
        thumbBox.appendChild(canvas);
        cell.appendChild(thumbBox);

        if (isAnimatedCrosshairStyle(settings)) {
            startThumbnailAnimation(canvas, settings, generation);
        } else {
            drawThumbnailFrame(canvas, settings);
        }

        const label = document.createElement("div");
        label.className = "history-label";
        label.textContent = version.label;
        if (isActive) label.style.color = playerColorRGB;
        cell.appendChild(label);

        container.appendChild(cell);
    });
}

function selectVersion(index) {
    if (index < 0 || index >= versions.length) return;

    selectedVersionIndex = index;

    const version = versions[index];
    currentSettings = renderer.parseCode(version.shareCode);
    updateControlsFromSettings(currentSettings);
    renderForCurrentStyle();
    document.getElementById("crosshairCode").value = version.shareCode;
    renderStats({ nickname: playerNickname, stats: version.stats });

    renderVersionHistory();
    updateUrlParams({ history: index === 0 ? null : String(index) });
}

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
    versions = buildVersionList(data);
    selectedVersionIndex = 0;

    const urlParams = new URLSearchParams(window.location.search);
    const historyParam = urlParams.get("history");
    if (historyParam !== null) {
        const idx = parseInt(historyParam, 10);
        if (Number.isInteger(idx) && idx >= 0 && idx < versions.length) {
            selectedVersionIndex = idx;
        }
    }

    if (selectedVersionIndex !== 0) {
        const version = versions[selectedVersionIndex];
        originalCode = version.shareCode;
        originalSettings = renderer.parseCode(originalCode);
        currentSettings = { ...originalSettings };
        document.getElementById("crosshairCode").value = originalCode;
        renderStats({ nickname: playerNickname, stats: version.stats });
    }

    setupControls();
    setupAspectRatioSelect();
    setupWeaponSelect();
    setupPreviewScaleSelect();
    setupFireTest();
    setupBackgroundCycle();
    renderVersionHistory();
    updateControlsFromSettings(currentSettings);
    renderForCurrentStyle();
    updateBackground();
    updateBackgroundStretch();
    startBackgroundCycle();
    syncSettingsPanelHeight();
    loadProPlayersData();
    initThemeToggle();
    initWindowDrag();
});

function initWindowDrag() {
    const win = document.getElementById("mainWindow");
    const titleBar = win.querySelector(".title-bar");
    if (!win || !titleBar) return;

    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    const startDrag = (clientX, clientY) => {
        const rect = win.getBoundingClientRect();
        if (win.style.position !== "fixed") {
            win.style.position = "fixed";
            win.style.margin = "0";
            win.style.left = rect.left + "px";
            win.style.top = rect.top + "px";
        }
        offsetX = clientX - rect.left;
        offsetY = clientY - rect.top;
        dragging = true;
        document.body.style.userSelect = "none";
    };

    const moveDrag = (clientX, clientY) => {
        if (!dragging) return;
        const minVisible = 60;
        const maxLeft = window.innerWidth - minVisible;
        const maxTop = window.innerHeight - 30;
        const newLeft = Math.min(Math.max(clientX - offsetX, minVisible - win.offsetWidth), maxLeft);
        const newTop = Math.min(Math.max(clientY - offsetY, 0), maxTop);
        win.style.left = newLeft + "px";
        win.style.top = newTop + "px";
    };

    const endDrag = () => {
        dragging = false;
        document.body.style.userSelect = "";
    };

    titleBar.addEventListener("mousedown", (e) => {
        if (e.target.closest(".title-bar-controls")) return;
        startDrag(e.clientX, e.clientY);
        e.preventDefault();
    });

    window.addEventListener("mousemove", (e) => moveDrag(e.clientX, e.clientY));
    window.addEventListener("mouseup", endDrag);
}

function initThemeToggle() {
    const toggle = document.getElementById("themeToggle");
    const link = document.getElementById("darkThemeLink");
    if (!toggle || !link) return;

    const refreshLabel = () => {
        const isDark = document.documentElement.classList.contains("dark-mode");
        toggle.textContent = isDark ? "Dark" : "Light";
    };
    refreshLabel();

    const toggleTheme = () => {
        const isDark = document.documentElement.classList.toggle("dark-mode");
        link.media = isDark ? "all" : "not all";
        localStorage.setItem("theme", isDark ? "dark" : "light");
        refreshLabel();
    };

    toggle.addEventListener("click", toggleTheme);
    toggle.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleTheme();
        }
    });
}

const SETTINGS_PANEL_DESKTOP_MEDIA = window.matchMedia("(min-width: 860px)");

function syncSettingsPanelHeight() {
    const previewGroup = document.querySelector(".layout-preview-group");
    const settings = document.querySelector(".layout-settings");
    if (!previewGroup || !settings) return;

    if (!SETTINGS_PANEL_DESKTOP_MEDIA.matches) {
        settings.style.maxHeight = "";
        return;
    }

    settings.style.maxHeight = "0px";
    settings.style.maxHeight = previewGroup.offsetHeight + "px";
}

window.addEventListener("resize", syncSettingsPanelHeight);

async function loadProPlayersData() {
    try {
        const response = await fetch("/static/assets/pro-players.json");
        proPlayersData = await response.json();
    } catch (error) {
        console.error("failed to load pro-players.json:", error);
        proPlayersData = {};
    }
}

function setupControls() {
    const rangeInputs = document.querySelectorAll("input[type=range]");
    rangeInputs.forEach(input => {
        const valueSpan = document.getElementById(input.id + "_value");

        input.addEventListener("input", function () {
            const value = parseFloat(this.value);
            valueSpan.textContent = value;
            currentSettings[this.id] = value;
            updateCrosshair();
        });
    });

    const checkboxes = document.querySelectorAll("input[type=checkbox]");
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener("change", function () {
            currentSettings[this.id] = this.checked;
            updateCrosshair();
        });
    });

    const selects = document.querySelectorAll("select");
    selects.forEach(select => {
        if (select.id.startsWith("cl_")) {
            const valueSpan = document.getElementById(select.id + "_value");
            select.addEventListener("change", function () {
                const value = parseInt(this.value);
                if (valueSpan) valueSpan.textContent = value;
                currentSettings[this.id] = value;
                updateCrosshair();
            });
        }
    });

    setupColorPicker();
    setupAutocomplete();
}

function rgbToHex(r, g, b) {
    const toHex = n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function setupColorPicker() {
    const picker = document.getElementById("cl_crosshaircolor_picker");
    if (!picker) return;

    picker.addEventListener("input", function () {
        const hex = this.value;
        currentSettings.cl_crosshaircolor_r = parseInt(hex.slice(1, 3), 16);
        currentSettings.cl_crosshaircolor_g = parseInt(hex.slice(3, 5), 16);
        currentSettings.cl_crosshaircolor_b = parseInt(hex.slice(5, 7), 16);
        updateCrosshair();
    });
}

function setupAutocomplete() {
    const searchInput = document.getElementById("searchInput");
    const autocompleteResults = document.getElementById("autocompleteResults");

    searchInput.addEventListener("input", function () {
        const searchType = document.getElementById("searchType").value;
        if (searchType === "proplayer" && proPlayersData) {
            showAutocomplete(this.value);
        } else {
            hideAutocomplete();
        }
    });

    searchInput.addEventListener("keydown", function (e) {
        const searchType = document.getElementById("searchType").value;

        if (searchType === "proplayer") {
            const items = autocompleteResults.querySelectorAll(".autocomplete-item");

            if (e.key === "ArrowDown") {
                e.preventDefault();
                selectedAutocompleteIndex = Math.min(selectedAutocompleteIndex + 1, items.length - 1);
                updateAutocompleteSelection(items);
                return;
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                selectedAutocompleteIndex = Math.max(selectedAutocompleteIndex - 1, -1);
                updateAutocompleteSelection(items);
                return;
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (selectedAutocompleteIndex >= 0 && items[selectedAutocompleteIndex]) {
                    selectAutocompleteItem(items[selectedAutocompleteIndex]);
                } else {
                    goToSearch();
                }
                return;
            } else if (e.key === "Escape") {
                hideAutocomplete();
                searchInput.blur();
                return;
            }
        }

        if (e.key === "Enter") {
            e.preventDefault();
            goToSearch();
        }
    });

    document.addEventListener("click", function (e) {
        if (!e.target.closest(".autocomplete-container")) {
            hideAutocomplete();
        }
    });
}

function showAutocomplete(query) {
    const autocompleteResults = document.getElementById("autocompleteResults");

    if (!query || query.length < 1) {
        hideAutocomplete();
        return;
    }

    const matches = findMatches(query, proPlayersData);

    if (matches.length === 0) {
        hideAutocomplete();
        return;
    }

    autocompleteResults.innerHTML = "";
    selectedAutocompleteIndex = -1;

    matches.slice(0, 10).forEach((match) => {
        const item = document.createElement("div");
        item.className = "autocomplete-item";

        if (match.image) {
            const img = document.createElement("img");
            img.className = "autocomplete-img";
            img.src = match.image;
            item.appendChild(img);
        }

        const typeSpan = document.createElement("span");
        typeSpan.className = "autocomplete-type";
        typeSpan.textContent = match.type;
        item.appendChild(typeSpan);
        item.appendChild(document.createTextNode(" | "));

        const nameSpan = document.createElement("span");
        nameSpan.className = "autocomplete-name";
        nameSpan.textContent = match.name;
        item.appendChild(nameSpan);
        item.appendChild(document.createTextNode(" | "));

        const steamidSpan = document.createElement("span");
        steamidSpan.className = "autocomplete-steamid";
        steamidSpan.textContent = match.steamid;
        item.appendChild(steamidSpan);

        item.setAttribute("data-name", match.name);
        item.setAttribute("data-steamid", match.steamid);

        item.addEventListener("click", function () {
            selectAutocompleteItem(this);
        });

        autocompleteResults.appendChild(item);
    });

    autocompleteResults.style.display = "block";
}

function hideAutocomplete() {
    const autocompleteResults = document.getElementById("autocompleteResults");
    autocompleteResults.style.display = "none";
    selectedAutocompleteIndex = -1;
}

function updateAutocompleteSelection(items) {
    items.forEach((item, index) => {
        item.classList.toggle("selected", index === selectedAutocompleteIndex);
    });
}

function selectAutocompleteItem(item) {
    const name = item.getAttribute("data-name");
    const steamid = item.getAttribute("data-steamid");

    document.getElementById("searchInput").value = name;
    document.getElementById("searchInput").setAttribute("data-steamid", steamid);
    hideAutocomplete();
}

function findMatches(query, proPlayersData) {
    const matches = [];
    const queryLower = query.toLowerCase();

    for (const [name, data] of Object.entries(proPlayersData.players)) {
        if (name.toLowerCase().includes(queryLower)) {
            matches.push({
                name: name,
                steamid: data.steamid,
                type: data.type,
                image: data.image,
                relevance: calculateRelevance(name.toLowerCase(), queryLower)
            });
        }
    }

    matches.sort((a, b) => b.relevance - a.relevance);
    return matches;
}

function calculateRelevance(name, query) {
    if (name === query) return 1000;
    if (name.startsWith(query)) return 500;
    return 100 / (name.indexOf(query) + 1);
}

function updateControlsFromSettings(settings) {
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

let nativeRes = { width: 1920, height: 1080 };
let aspectRatioOptions = [];
let selectedAspectRatio = null;

const PREVIEW_SCALE_OPTIONS = [1, 2, 4, 8];
let previewScale = 1;

function setupPreviewScaleSelect() {
    const slider = document.getElementById("previewScaleSlider");
    const label = document.getElementById("previewScaleLabel");
    if (!slider) return;

    slider.value = "0";
    if (label) label.textContent = `${previewScale}x`;

    slider.addEventListener("input", function () {
        previewScale = PREVIEW_SCALE_OPTIONS[parseInt(this.value, 10)];
        if (label) label.textContent = `${previewScale}x`;
        renderForCurrentStyle();
    });
}

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

function setupAspectRatioSelect() {
    const select = document.getElementById("aspectRatioSelect");
    if (!select) return;

    nativeRes = detectNativeResolution();
    const nativeRatio = nativeRes.width / nativeRes.height;

    const hasNativePreset = ASPECT_RATIO_PRESETS.some(p => Math.abs(p.ratio - nativeRatio) < 0.001);
    aspectRatioOptions = hasNativePreset
        ? ASPECT_RATIO_PRESETS
        : [...ASPECT_RATIO_PRESETS, { label: formatRatio(nativeRatio), ratio: nativeRatio }]
            .sort((a, b) => a.ratio - b.ratio);

    let nativeIndex = 0;
    aspectRatioOptions.forEach((ar, index) => {
        const option = document.createElement("option");
        option.value = String(index);
        const isNative = Math.abs(ar.ratio - nativeRatio) < 0.001;
        if (isNative) nativeIndex = index;
        option.textContent = ar.label;
        select.appendChild(option);
    });

    let initialIndex = nativeIndex;
    const aspectParam = new URLSearchParams(window.location.search).get("aspect");
    if (aspectParam) {
        const matchedIndex = aspectRatioOptions.findIndex(ar => ar.label.toLowerCase() === aspectParam.toLowerCase());
        if (matchedIndex !== -1) initialIndex = matchedIndex;
    }

    selectedAspectRatio = aspectRatioOptions[initialIndex];
    select.value = String(initialIndex);
    select.addEventListener("change", function () {
        const index = parseInt(this.value, 10);
        selectedAspectRatio = aspectRatioOptions[index];
        renderForCurrentStyle();
        updateBackgroundStretch();
        updateUrlParams({ aspect: index === nativeIndex ? null : selectedAspectRatio.label });
    });
}

function resizeBilinear(srcCanvas, destWidth, destHeight) {
    destWidth = Math.max(1, Math.round(destWidth));
    destHeight = Math.max(1, Math.round(destHeight));

    const srcWidth = srcCanvas.width;
    const srcHeight = srcCanvas.height;
    const srcData = srcCanvas.getContext("2d").getImageData(0, 0, srcWidth, srcHeight).data;

    const destCanvas = document.createElement("canvas");
    destCanvas.width = destWidth;
    destCanvas.height = destHeight;
    const destCtx = destCanvas.getContext("2d");
    const destImageData = destCtx.createImageData(destWidth, destHeight);
    const destData = destImageData.data;

    const scaleX = srcWidth / destWidth;
    const scaleY = srcHeight / destHeight;

    const clamp255 = v => (v < 0 ? 0 : v > 255 ? 255 : v);

    function premultipliedSrcPixel(x, y) {
        x = x < 0 ? 0 : x >= srcWidth ? srcWidth - 1 : x;
        y = y < 0 ? 0 : y >= srcHeight ? srcHeight - 1 : y;
        const i = (y * srcWidth + x) * 4;
        const sa = srcData[i + 3] / 255;
        return [srcData[i] * sa, srcData[i + 1] * sa, srcData[i + 2] * sa, srcData[i + 3]];
    }

    for (let dy = 0; dy < destHeight; dy++) {
        const srcY = (dy + 0.5) * scaleY - 0.5;
        const y0 = Math.floor(srcY);
        const fy = srcY - y0;

        for (let dx = 0; dx < destWidth; dx++) {
            const srcX = (dx + 0.5) * scaleX - 0.5;
            const x0 = Math.floor(srcX);
            const fx = srcX - x0;

            const p00 = premultipliedSrcPixel(x0, y0);
            const p10 = premultipliedSrcPixel(x0 + 1, y0);
            const p01 = premultipliedSrcPixel(x0, y0 + 1);
            const p11 = premultipliedSrcPixel(x0 + 1, y0 + 1);

            const w00 = (1 - fx) * (1 - fy);
            const w10 = fx * (1 - fy);
            const w01 = (1 - fx) * fy;
            const w11 = fx * fy;

            const r = p00[0] * w00 + p10[0] * w10 + p01[0] * w01 + p11[0] * w11;
            const g = p00[1] * w00 + p10[1] * w10 + p01[1] * w01 + p11[1] * w11;
            const b = p00[2] * w00 + p10[2] * w10 + p01[2] * w01 + p11[2] * w11;
            const alpha = p00[3] * w00 + p10[3] * w10 + p01[3] * w01 + p11[3] * w11;

            const i = (dy * destWidth + dx) * 4;
            const outAlpha = clamp255(alpha);
            if (outAlpha > 0) {
                const unpremul = outAlpha / 255;
                destData[i] = clamp255(r / unpremul);
                destData[i + 1] = clamp255(g / unpremul);
                destData[i + 2] = clamp255(b / unpremul);
                destData[i + 3] = outAlpha;
            }
        }
    }

    destCtx.putImageData(destImageData, 0, 0);
    return destCanvas;
}

const SHARPEN_AMOUNT = 0.6;
const SHARPEN_RADIUS = 1;

function sharpenCanvas(canvas, amount = SHARPEN_AMOUNT, radius = SHARPEN_RADIUS) {
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    const premul = new Float32Array(data.length);
    for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3] / 255;
        premul[i] = data[i] * a;
        premul[i + 1] = data[i + 1] * a;
        premul[i + 2] = data[i + 2] * a;
        premul[i + 3] = data[i + 3];
    }

    const blurred = new Float32Array(premul.length);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, a = 0, count = 0;
            for (let dy = -radius; dy <= radius; dy++) {
                const sy = Math.min(height - 1, Math.max(0, y + dy));
                for (let dx = -radius; dx <= radius; dx++) {
                    const sx = Math.min(width - 1, Math.max(0, x + dx));
                    const i = (sy * width + sx) * 4;
                    r += premul[i];
                    g += premul[i + 1];
                    b += premul[i + 2];
                    a += premul[i + 3];
                    count++;
                }
            }
            const oi = (y * width + x) * 4;
            blurred[oi] = r / count;
            blurred[oi + 1] = g / count;
            blurred[oi + 2] = b / count;
            blurred[oi + 3] = a / count;
        }
    }

    const clamp255 = v => (v < 0 ? 0 : v > 255 ? 255 : v);

    for (let i = 0; i < data.length; i += 4) {
        const pr = premul[i] + amount * (premul[i] - blurred[i]);
        const pg = premul[i + 1] + amount * (premul[i + 1] - blurred[i + 1]);
        const pb = premul[i + 2] + amount * (premul[i + 2] - blurred[i + 2]);
        const pa = clamp255(premul[i + 3] + amount * (premul[i + 3] - blurred[i + 3]));

        if (pa > 0) {
            const unpremul = pa / 255;
            data[i] = clamp255(pr / unpremul);
            data[i + 1] = clamp255(pg / unpremul);
            data[i + 2] = clamp255(pb / unpremul);
            data[i + 3] = pa;
        } else {
            data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0;
        }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
}

function computeCrosshairFrame(settings, spreadOverride = null, speed = 0) {
    const ratio = selectedAspectRatio ? selectedAspectRatio.ratio : (nativeRes.width / nativeRes.height);
    const gameRes = { width: Math.round(nativeRes.height * ratio), height: nativeRes.height };

    let baseDistanceGoal = settings.cl_crosshairgap_useweaponvalue ? selectedWeapon.deployedGap : 4;
    if (parseInt(settings.cl_crosshairstyle) === 2 && speed > FAST_MOVE_GAP_THRESHOLD) {
        baseDistanceGoal *= FAST_MOVE_GAP_MULTIPLIER;
    }

    const gameRendered = renderer.renderCrosshair(settings, gameRes.height, spreadOverride, baseDistanceGoal);
    const intermediateSize = gameRendered.width;

    const horizontalScale = nativeRes.width / gameRes.width;
    const finalWidth = Math.max(8, Math.round(intermediateSize * horizontalScale));
    const finalHeight = intermediateSize;

    let resultCanvas = gameRendered;
    if (finalWidth !== intermediateSize) {
        resultCanvas = resizeBilinear(gameRendered, finalWidth, finalHeight);
        sharpenCanvas(resultCanvas);
    }

    return { canvas: resultCanvas, width: finalWidth, height: finalHeight };
}

function renderCrosshairToCanvas(settings, spreadOverride = null, speed = 0) {
    const canvas = document.getElementById("crosshairCanvas");
    const ctx = canvas.getContext("2d");

    const frame = computeCrosshairFrame(settings, spreadOverride, speed);

    canvas.width = frame.width;
    canvas.height = frame.height;
    canvas.style.width = (frame.width * previewScale) + "px";
    canvas.style.height = (frame.height * previewScale) + "px";
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, frame.width, frame.height);
    ctx.drawImage(frame.canvas, 0, 0);
}

const CS_PLAYER_SPEED_DUCK_MODIFIER = 0.34;
const MOVEMENT_CURVE_EXPONENT = 0.25;
const FAST_MOVE_GAP_THRESHOLD = 100;
const FAST_MOVE_GAP_MULTIPLIER = 1.5;
const CROSSHAIR_FOV_DEGREES = 90;

let selectedWeapon = WEAPON_PRESETS.find(w => w.name === "AK-47") || WEAPON_PRESETS[0];

function setupWeaponSelect() {
    const select = document.getElementById("weaponSelect");
    if (!select) return;

    const categories = [...new Set(WEAPON_PRESETS.map(w => w.category))];
    categories.forEach(category => {
        const group = document.createElement("optgroup");
        group.label = category;
        WEAPON_PRESETS.filter(w => w.category === category).forEach(weapon => {
            const option = document.createElement("option");
            option.value = weapon.name;
            option.textContent = weapon.name;
            group.appendChild(option);
        });
        select.appendChild(group);
    });

    const weaponParam = new URLSearchParams(window.location.search).get("weapon");
    if (weaponParam) {
        const matched = WEAPON_PRESETS.find(w => w.name.toLowerCase() === weaponParam.toLowerCase());
        if (matched) selectedWeapon = matched;
    }

    const defaultWeaponName = (WEAPON_PRESETS.find(w => w.name === "AK-47") || WEAPON_PRESETS[0]).name;

    select.value = selectedWeapon.name;
    select.addEventListener("change", function () {
        selectedWeapon = WEAPON_PRESETS.find(w => w.name === this.value) || selectedWeapon;
        renderForCurrentStyle();
        updateUrlParams({ weapon: selectedWeapon.name === defaultWeaponName ? null : selectedWeapon.name });
    });
}

function computeSpreadPixels(weapon, speed, referenceHeight, splitDistCvar, baselineOverride = null) {
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
    const distancePixels = renderer.roundToEven(rawSpread * yresScale);

    const isSplit = rawSpread > splitDistCvar;
    const cappedDistancePixels = isSplit ? renderer.roundToEven(splitDistCvar * yresScale) : null;

    return { distancePixels, isSplit, cappedDistancePixels };
}

const MOVEMENT_STANDING_MS = 1000;
const MOVEMENT_ACCEL_MS = 300;
const MOVEMENT_MOVING_MS = 1000;
const MOVEMENT_DECEL_MS = 300;
const MOVEMENT_CYCLE_MS = MOVEMENT_STANDING_MS + MOVEMENT_ACCEL_MS + MOVEMENT_MOVING_MS + MOVEMENT_DECEL_MS;

let movementAnimationHandle = null;
let movementAnimationStart = null;

let previewHoverActive = false;
let previewMouseHeld = false;
let fireTestHandle = null;
let firePenaltyValue = 0;
let firePausedSpeed = 0;
let lastShotTime = -Infinity;
let resumeElapsedMs = 0;

function isAnimatedCrosshairStyle(settings) {
    return parseInt(settings.cl_crosshairstyle) === 2;
}

const SPLIT_ONLY_CONTROL_IDS = [
    "cl_crosshair_dynamic_splitdist",
    "cl_crosshair_dynamic_splitalpha_innermod",
    "cl_crosshair_dynamic_splitalpha_outermod",
    "cl_crosshair_dynamic_maxdist_splitratio"
];

function updateSplitControlsAvailability() {
    const enabled = isAnimatedCrosshairStyle(currentSettings);
    SPLIT_ONLY_CONTROL_IDS.forEach(id => {
        const input = document.getElementById(id);
        if (!input) return;
        input.disabled = !enabled;
        input.closest(".control-group").classList.toggle("control-disabled", !enabled);
    });
}

function updateColorControlsAvailability() {
    const enabled = parseInt(currentSettings.cl_crosshaircolor) === 5;
    const picker = document.getElementById("cl_crosshaircolor_picker");
    if (!picker) return;
    picker.disabled = !enabled;
    picker.closest(".control-group").classList.toggle("control-disabled", !enabled);
}

function getMovementPhase(elapsedMs, weapon) {
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

function setMovementSpeed(speed) {
    const label = document.getElementById("movementStateLabel");
    if (label) label.textContent = `${Math.round(speed)} u/s`;
}

function stopMovementAnimation() {
    if (movementAnimationHandle !== null) {
        cancelAnimationFrame(movementAnimationHandle);
        movementAnimationHandle = null;
    }
    movementAnimationStart = null;
    setMovementSpeed(0);
}

function startMovementAnimation(elapsedOffsetMs = 0) {
    movementAnimationStart = performance.now() - elapsedOffsetMs;

    const tick = (now) => {
        if (!isAnimatedCrosshairStyle(currentSettings)) {
            stopMovementAnimation();
            renderCrosshairToCanvas(currentSettings);
            return;
        }

        if (previewHoverActive) {
            movementAnimationHandle = null;
            return;
        }

        const phase = getMovementPhase(now - movementAnimationStart, selectedWeapon);
        setMovementSpeed(phase.speed);

        const splitDist = Number(currentSettings.cl_crosshair_dynamic_splitdist);
        const spreadOverride = computeSpreadPixels(selectedWeapon, phase.speed, nativeRes.height, splitDist);

        renderCrosshairToCanvas(currentSettings, spreadOverride, phase.speed);

        movementAnimationHandle = requestAnimationFrame(tick);
    };

    movementAnimationHandle = requestAnimationFrame(tick);
}

function renderForCurrentStyle() {
    updateSplitControlsAvailability();
    updateColorControlsAvailability();

    if (!isAnimatedCrosshairStyle(currentSettings)) {
        stopMovementAnimation();
        renderCrosshairToCanvas(currentSettings);
        return;
    }

    if (previewHoverActive) return;
    if (movementAnimationHandle !== null) return;

    startMovementAnimation(0);
}

function canFireWeapon(weapon) {
    return !!weapon && weapon.cycleTime > 0;
}

function attemptFire(now) {
    const weapon = selectedWeapon;
    if (!canFireWeapon(weapon)) return;
    if (now - lastShotTime < weapon.cycleTime * 1000) return;

    lastShotTime = now;
    firePenaltyValue += weapon.fireInaccuracy;
}

function stopFireTestMode() {
    previewHoverActive = false;
    previewMouseHeld = false;
    if (fireTestHandle !== null) {
        cancelAnimationFrame(fireTestHandle);
        fireTestHandle = null;
    }
}

function startFireTestLoop() {
    let lastFrameTime = performance.now();

    const tick = (now) => {
        if (!previewHoverActive) return;

        if (!isAnimatedCrosshairStyle(currentSettings)) {
            stopFireTestMode();
            renderCrosshairToCanvas(currentSettings);
            return;
        }

        const dt = (now - lastFrameTime) / 1000;
        lastFrameTime = now;

        const weapon = selectedWeapon;
        if (canFireWeapon(weapon)) {
            if (previewMouseHeld && weapon.fullAuto) {
                attemptFire(now);
            }
            const decayFactor = Math.log(10) / weapon.recoveryTimeStand;
            firePenaltyValue = weapon.standInaccuracy + (firePenaltyValue - weapon.standInaccuracy) * Math.exp(-decayFactor * dt);
        }

        const splitDist = Number(currentSettings.cl_crosshair_dynamic_splitdist);
        const spreadOverride = computeSpreadPixels(weapon, firePausedSpeed, nativeRes.height, splitDist, firePenaltyValue);

        renderCrosshairToCanvas(currentSettings, spreadOverride, firePausedSpeed);

        fireTestHandle = requestAnimationFrame(tick);
    };

    fireTestHandle = requestAnimationFrame(tick);
}

function enterPreviewHover() {
    if (!isAnimatedCrosshairStyle(currentSettings)) return;
    if (previewHoverActive) return;

    previewHoverActive = true;

    if (movementAnimationHandle !== null) {
        resumeElapsedMs = performance.now() - movementAnimationStart;
        cancelAnimationFrame(movementAnimationHandle);
        movementAnimationHandle = null;
    }

    firePausedSpeed = 0;
    setMovementSpeed(firePausedSpeed);
    firePenaltyValue = selectedWeapon ? selectedWeapon.standInaccuracy : 0;
    lastShotTime = -Infinity;

    startFireTestLoop();
}

function exitPreviewHover() {
    if (!previewHoverActive) return;

    stopFireTestMode();

    if (isAnimatedCrosshairStyle(currentSettings)) {
        startMovementAnimation(resumeElapsedMs);
    }
}

function setupFireTest() {
    const target = document.getElementById("crosshairImage");
    if (!target) return;

    target.addEventListener("mouseenter", enterPreviewHover);
    target.addEventListener("mouseleave", exitPreviewHover);
    target.addEventListener("mousedown", (e) => {
        if (e.button !== 0 || !previewHoverActive) return;
        previewMouseHeld = true;
        attemptFire(performance.now());
    });
    target.addEventListener("mouseup", (e) => {
        if (e.button !== 0) return;
        previewMouseHeld = false;
    });
}

function updateCrosshair() {
    renderForCurrentStyle();

    const newCode = renderer.generateCode(currentSettings);
    document.getElementById("crosshairCode").value = newCode;
}

const BACKGROUND_DIR = "/static/assets/panorama/images/map_icons/screenshots/1080p/";
const backgrounds = [
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
].map(name => BACKGROUND_DIR + name);

let currentBackgroundIndex = 0;
const crosshairDiv = document.getElementById("crosshairImage");
const crosshairBg = document.getElementById("crosshairBg");

function updateBackground() {
    const imageUrl = backgrounds[currentBackgroundIndex];
    const testImg = new Image();
    testImg.onload = function () {
        crosshairBg.style.backgroundImage = `url("${imageUrl}")`;
    };
    testImg.onerror = function () {
        console.error("failed to load image:", imageUrl);
        crosshairBg.style.backgroundImage = `url("${backgrounds[0]}")`;
    };
    testImg.src = imageUrl;
}

let backgroundShuffleQueue = [];
let backgroundHistory = [currentBackgroundIndex];
let backgroundHistoryPos = 0;

function refillBackgroundShuffleQueue(avoidIndex) {
    const indices = backgrounds.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    if (indices.length > 1 && indices[0] === avoidIndex) {
        [indices[0], indices[1]] = [indices[1], indices[0]];
    }
    backgroundShuffleQueue = indices;
}

function advanceBackground() {
    if (backgroundHistoryPos < backgroundHistory.length - 1) {
        backgroundHistoryPos++;
    } else {
        if (backgroundShuffleQueue.length === 0) refillBackgroundShuffleQueue(currentBackgroundIndex);
        backgroundHistory.push(backgroundShuffleQueue.shift());
        backgroundHistoryPos = backgroundHistory.length - 1;
    }
    currentBackgroundIndex = backgroundHistory[backgroundHistoryPos];
    updateBackground();
}

function retreatBackground() {
    if (backgroundHistoryPos === 0) return;
    backgroundHistoryPos--;
    currentBackgroundIndex = backgroundHistory[backgroundHistoryPos];
    updateBackground();
}

const BACKGROUND_CYCLE_MS = 5000;
let backgroundCycleHandle = null;

function startBackgroundCycle() {
    if (backgroundCycleHandle !== null) return;
    backgroundCycleHandle = setInterval(advanceBackground, BACKGROUND_CYCLE_MS);
}

function stopBackgroundCycle() {
    if (backgroundCycleHandle !== null) {
        clearInterval(backgroundCycleHandle);
        backgroundCycleHandle = null;
    }
}

function setupBackgroundCycle() {
    const target = document.getElementById("crosshairImage");
    if (!target) return;

    target.addEventListener("mouseenter", stopBackgroundCycle);
    target.addEventListener("mouseleave", startBackgroundCycle);
}

function updateBackgroundStretch() {
    const ratio = selectedAspectRatio ? selectedAspectRatio.ratio : (nativeRes.width / nativeRes.height);
    const gameWidth = Math.round(nativeRes.height * ratio);
    const horizontalScale = nativeRes.width / gameWidth;
    crosshairBg.style.transform = `scaleX(${horizontalScale})`;
}

function prevBackground() {
    retreatBackground();
}

function nextBackground() {
    advanceBackground();
}

const SNAP_BACK_TRANSITION = "transform 0.25s ease";
const FOLLOW_EDGE_MARGIN = 10;

crosshairDiv.addEventListener("mousemove", (e) => {
    const canvas = document.getElementById("crosshairCanvas");
    const rect = crosshairDiv.getBoundingClientRect();
    const maxOffsetX = Math.max(0, (rect.width - canvas.offsetWidth) / 2 - FOLLOW_EDGE_MARGIN);
    const maxOffsetY = Math.max(0, (rect.height - canvas.offsetHeight) / 2 - FOLLOW_EDGE_MARGIN);
    const dx = Math.max(-maxOffsetX, Math.min(maxOffsetX, e.clientX - (rect.left + rect.width / 2)));
    const dy = Math.max(-maxOffsetY, Math.min(maxOffsetY, e.clientY - (rect.top + rect.height / 2)));

    canvas.style.transition = "none";
    canvas.style.transform = `translate(${dx}px, ${dy}px)`;
});

crosshairDiv.addEventListener("mouseleave", () => {
    const canvas = document.getElementById("crosshairCanvas");
    canvas.style.transition = SNAP_BACK_TRANSITION;
    canvas.style.transform = "translate(0px, 0px)";
});

const searchCfg = {
    proplayer: {
        prefix: "",
        placeholder: "<pro_player>"
    },
    steamvanity: {
        prefix: "https://steamcommunity.com/id/",
        placeholder: "<steam_vanity>"
    },
    steamid64: {
        prefix: "https://steamcommunity.com/profiles/",
        placeholder: "<steamid64>"
    },
    leetify: {
        prefix: "https://leetify.com/@",
        placeholder: "<leetify_handle>"
    }
};

const select = document.getElementById("searchType");
const prefixSpan = document.getElementById("inputPrefix");
const input = document.getElementById("searchInput");

function updatePrefix() {
    const cfg = searchCfg[select.value] || { prefix: "", placeholder: "search..." };

    prefixSpan.textContent = cfg.prefix;
    input.placeholder = cfg.placeholder;
    input.removeAttribute("data-steamid");
    hideAutocomplete();

    if (cfg.prefix && select.value !== "proplayer") {
        prefixSpan.style.visibility = "hidden";
        prefixSpan.style.display = "inline-block";
        const width = prefixSpan.offsetWidth;
        prefixSpan.style.visibility = "";
        prefixSpan.style.display = "";

        input.style.paddingLeft = (width + 6) + "px";
    } else {
        input.style.paddingLeft = "8px";
    }

    input.value = "";
}

select.addEventListener("change", updatePrefix);

updatePrefix();

function goToSearch() {
    const inputElement = document.getElementById("searchInput");
    const searchValue = inputElement.value.trim();
    const type = document.getElementById("searchType").value;

    if (!searchValue) {
        alert("please enter someone to search");
        return;
    }

    const steamID64Pattern = /^7656119\d{10}$/;
    const allowedUsernamePattern = /^[a-zA-Z0-9_-]+$/;
    const baseDomain = window.location.origin;

    let path = "";

    if (type === "proplayer") {
        const steamid = inputElement.getAttribute("data-steamid");
        if (steamid) {
            path = `/profiles/${steamid}`;
        } else if (proPlayersData && proPlayersData.players && proPlayersData.players[searchValue]) {
            path = `/profiles/${proPlayersData.players[searchValue].steamid}`;
        } else {
            alert("player not found.");
            return;
        }
    } else if (type === "steamid64") {
        if (!steamID64Pattern.test(searchValue)) {
            alert("invalid steamid64.");
            return;
        }
        path = `/profiles/${searchValue}`;
    } else if (type === "steamvanity") {
        if (!allowedUsernamePattern.test(searchValue)) {
            alert("invalid steam vanity url.");
            return;
        }
        path = `/id/${searchValue}`;
    } else if (type === "leetify") {
        if (!allowedUsernamePattern.test(searchValue)) {
            alert("invalid leetify handle.");
            return;
        }
        path = `/${searchValue}`;
    }

    window.location.href = baseDomain + path;
}

function copyCode() {
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

const GIF_FRAME_INTERVAL_MS = 50;

async function buildClassicCrosshairGif(settings, weapon) {
    const { GIFEncoder, quantize, applyPalette } = window.gifenc;

    const splitDist = Number(settings.cl_crosshair_dynamic_splitdist);

    const maxSpread = computeSpreadPixels(weapon, weapon.maxSpeed, nativeRes.height, splitDist, false);
    const maxFrame = computeCrosshairFrame(settings, maxSpread, weapon.maxSpeed);
    const gifWidth = maxFrame.width;
    const gifHeight = maxFrame.height;

    const scratch = document.createElement("canvas");
    scratch.width = gifWidth;
    scratch.height = gifHeight;
    const scratchCtx = scratch.getContext("2d");
    scratchCtx.imageSmoothingEnabled = false;

    const gif = GIFEncoder();

    for (let t = 0; t < MOVEMENT_CYCLE_MS; t += GIF_FRAME_INTERVAL_MS) {
        const phase = getMovementPhase(t, weapon);
        const spreadOverride = computeSpreadPixels(weapon, phase.speed, nativeRes.height, splitDist);
        const frame = computeCrosshairFrame(settings, spreadOverride, phase.speed);

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

async function downloadImage(event) {
    const code = document.getElementById("crosshairCode").value;

    if (!isAnimatedCrosshairStyle(currentSettings)) {
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
        const blob = await buildClassicCrosshairGif(currentSettings, selectedWeapon);
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

function shareCrosshair() {
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
