// @ts-nocheck
class CS2CrosshairRenderer {
    constructor() {
        this.DICTIONARY = 'ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789';
        this.DICTIONARY_LENGTH = this.DICTIONARY.length;

        this.defaultSettings = {
            cl_crosshairalpha: 255,
            cl_crosshaircolor: 5,
            cl_crosshaircolor_b: 50,
            cl_crosshaircolor_g: 250,
            cl_crosshaircolor_r: 50,
            cl_crosshairdot: false,
            cl_crosshairgap: -2,
            cl_crosshairsize: 2,
            cl_crosshairstyle: 4,
            cl_crosshairusealpha: true,
            cl_crosshairthickness: 1,
            cl_crosshair_drawoutline: true,
            cl_crosshair_outlinethickness: 1,
            cl_crosshair_dynamic_maxdist_splitratio: 0.35,
            cl_crosshair_dynamic_splitalpha_innermod: 1,
            cl_crosshair_dynamic_splitalpha_outermod: 0.5,
            cl_crosshair_dynamic_splitdist: 7,
            cl_crosshair_t: false,
            cl_fixedcrosshairgap: -2,
            cl_crosshairgap_useweaponvalue: false,
            cl_crosshair_recoil: false
        };
    }

    signedByte(x) {
        return (x ^ 0x80) - 0x80;
    }

    parseCode(code) {
        try {
            let cleanCode = code.trim();

            if (!cleanCode.startsWith('CSGO-')) {
                if (cleanCode.length === 25 && /^[ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789]+$/.test(cleanCode)) {
                    cleanCode = `CSGO-${cleanCode.slice(0, 5)}-${cleanCode.slice(5, 10)}-${cleanCode.slice(10, 15)}-${cleanCode.slice(15, 20)}-${cleanCode.slice(20)}`;
                }
            }

            const codePattern = /^CSGO(-[ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789]{5}){5}$/;
            if (!codePattern.test(cleanCode)) {
                console.log('bad pattern, using default crosshair');
                return this.defaultSettings;
            }

            const chars = cleanCode.slice(5).replace(/-/g, '');

            let num = BigInt(0);
            for (const char of chars.split('').reverse()) {
                const index = this.DICTIONARY.indexOf(char);
                if (index === -1) {
                    throw new Error(`invalid char: ${char}`);
                }
                num = num * BigInt(this.DICTIONARY_LENGTH) + BigInt(index);
            }

            const hexnum = num.toString(16).padStart(36, '0');
            const bytes = [];
            for (let i = 0; i < hexnum.length; i += 2) {
                bytes.push(parseInt(hexnum.slice(i, i + 2), 16));
            }

            const checksum = bytes[0];
            const calculatedChecksum = bytes.slice(1).reduce((sum, byte) => sum + byte, 0) % 256;

            if (checksum !== calculatedChecksum) {
                console.log('checksum failed, using default crosshair');
                return this.defaultSettings;
            }

            const settings = {
                cl_crosshairgap: this.signedByte(bytes[2]) / 10,
                cl_crosshair_outlinethickness: bytes[3] / 2,
                cl_crosshaircolor_r: bytes[4],
                cl_crosshaircolor_g: bytes[5],
                cl_crosshaircolor_b: bytes[6],
                cl_crosshairalpha: bytes[7],
                cl_crosshair_dynamic_splitdist: bytes[8] & 0x7f,
                cl_crosshair_recoil: ((bytes[8] >> 7) & 1) === 1,
                cl_fixedcrosshairgap: this.signedByte(bytes[9]) / 10,
                cl_crosshaircolor: bytes[10] & 7,
                cl_crosshair_drawoutline: (bytes[10] & 8) === 8,
                cl_crosshair_dynamic_splitalpha_innermod: (bytes[10] >> 4) / 10,
                cl_crosshair_dynamic_splitalpha_outermod: (bytes[11] & 0xf) / 10,
                cl_crosshair_dynamic_maxdist_splitratio: (bytes[11] >> 4) / 10,
                cl_crosshairthickness: bytes[12] / 10,
                cl_crosshairstyle: (bytes[13] & 0xf) >> 1,
                cl_crosshairdot: ((bytes[13] >> 4) & 1) === 1,
                cl_crosshairgap_useweaponvalue: ((bytes[13] >> 5) & 1) === 1,
                cl_crosshairusealpha: ((bytes[13] >> 6) & 1) === 1,
                cl_crosshair_t: ((bytes[13] >> 7) & 1) === 1,
                cl_crosshairsize: (((bytes[15] & 0x1f) << 8) + bytes[14]) / 10
            };

            return settings;

        } catch (error) {
            console.error('parsing crosshair code error:', error);
            return this.defaultSettings;
        }
    }

    generateCode(settings) {
        try {
            const bytes = new Array(18).fill(0);
            bytes[1] = 1;
            bytes[2] = Math.round(settings.cl_crosshairgap * 10) & 0xff;

            bytes[3] = Math.round(settings.cl_crosshair_outlinethickness * 2);
            bytes[4] = Math.round(settings.cl_crosshaircolor_r);
            bytes[5] = Math.round(settings.cl_crosshaircolor_g);
            bytes[6] = Math.round(settings.cl_crosshaircolor_b);
            bytes[7] = Math.round(settings.cl_crosshairalpha);
            bytes[8] = (Math.round(settings.cl_crosshair_dynamic_splitdist) & 0x7f) |
                (settings.cl_crosshair_recoil ? 0x80 : 0);

            bytes[9] = Math.round(settings.cl_fixedcrosshairgap * 10) & 0xff;
            bytes[10] = (Math.round(settings.cl_crosshaircolor) & 7) |
                (settings.cl_crosshair_drawoutline ? 8 : 0) |
                ((Math.round(settings.cl_crosshair_dynamic_splitalpha_innermod * 10) & 0xf) << 4);

            bytes[11] = (Math.round(settings.cl_crosshair_dynamic_splitalpha_outermod * 10) & 0xf) |
                ((Math.round(settings.cl_crosshair_dynamic_maxdist_splitratio * 10) & 0xf) << 4);

            bytes[12] = Math.round(settings.cl_crosshairthickness * 10);
            bytes[13] = ((Math.round(settings.cl_crosshairstyle) & 0xf) << 1) |
                (settings.cl_crosshairdot ? 0x10 : 0) |
                (settings.cl_crosshairgap_useweaponvalue ? 0x20 : 0) |
                (settings.cl_crosshairusealpha ? 0x40 : 0) |
                (settings.cl_crosshair_t ? 0x80 : 0);

            const sizeValue = Math.round(settings.cl_crosshairsize * 10);
            bytes[14] = sizeValue & 0xff;
            bytes[15] = (sizeValue >> 8) & 0x1f;

            const checksum = bytes.slice(1).reduce((sum, byte) => sum + byte, 0) & 0xff;
            bytes[0] = checksum;

            const hexString = bytes.map(b => b.toString(16).padStart(2, '0')).join('');
            let num = BigInt('0x' + hexString);

            let result = '';
            for (let i = 0; i < 25; i++) {
                const remainder = Number(num % BigInt(this.DICTIONARY_LENGTH));
                result += this.DICTIONARY[remainder];
                num = num / BigInt(this.DICTIONARY_LENGTH);
            }

            return `CSGO-${result.slice(0, 5)}-${result.slice(5, 10)}-${result.slice(10, 15)}-${result.slice(15, 20)}-${result.slice(20)}`;

        } catch (error) {
            console.error('generating crosshair code error:', error);
            return 'CSGO-ERROR-ERROR-ERROR-ERROR-ERROR';
        }
    }

    getColor(settings) {
        const colorIndex = settings.cl_crosshaircolor;

        if (colorIndex === 5) {
            return [settings.cl_crosshaircolor_r, settings.cl_crosshaircolor_g, settings.cl_crosshaircolor_b];
        }

        const presetColors = {
            0: [255, 0, 0],   // red
            1: [0, 255, 0],   // green
            2: [255, 255, 0], // yellow
            3: [0, 0, 255],   // blue
            4: [0, 255, 255]  // cyan
        };

        return presetColors[colorIndex] || [0, 255, 0];
    }

    renderCrosshair(settings, canvasSize = 64) {
        const canvas = document.createElement('canvas');
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, canvasSize, canvasSize);

        const center = { x: canvasSize / 2, y: canvasSize / 2 };
        const [r, g, b] = this.getColor(settings);
        const alpha = settings.cl_crosshairusealpha ? settings.cl_crosshairalpha / 255 : 1;
        const style = parseInt(settings.cl_crosshairstyle);

        if (style !== 2 && style !== 4) {
            return canvas;
        }

        const crosshairLength = Math.floor(settings.cl_crosshairsize * 2);
        const crosshairWidth = Math.max(1, Math.floor(settings.cl_crosshairthickness * 2));
        const crosshairGap = Math.ceil(parseFloat(settings.cl_crosshairgap) + 4);

        const adjustedLength = parseInt(settings.cl_crosshairsize) > 2 ? crosshairLength + 1 : crosshairLength;

        const outlineThickness = settings.cl_crosshair_drawoutline ? settings.cl_crosshair_outlinethickness : 0;
        const crosshairColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;

        ctx.imageSmoothingEnabled = false;

        let translate = (crosshairWidth % 2) / 2;
        ctx.translate(translate, translate);

        if (settings.cl_crosshair_drawoutline && outlineThickness > 0) {
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;

            const strokeTranslate = (crosshairWidth / 2) - Math.floor(crosshairWidth / 2);
            ctx.translate(-translate, -translate);
            ctx.translate(strokeTranslate, strokeTranslate);

            ctx.fillRect(
                (center.x + ((crosshairWidth / 2) + crosshairGap)) - outlineThickness,
                (center.y - (crosshairWidth / 2)) - outlineThickness,
                adjustedLength + (outlineThickness * 2),
                crosshairWidth + (outlineThickness * 2)
            );

            ctx.fillRect(
                (center.x - ((adjustedLength + (crosshairWidth / 2)) + crosshairGap)) - outlineThickness,
                (center.y - (crosshairWidth / 2)) - outlineThickness,
                adjustedLength + (outlineThickness * 2),
                crosshairWidth + (outlineThickness * 2)
            );

            ctx.fillRect(
                (center.x - (crosshairWidth / 2)) - outlineThickness,
                (center.y + ((crosshairWidth / 2) + crosshairGap)) - outlineThickness,
                crosshairWidth + (outlineThickness * 2),
                adjustedLength + (outlineThickness * 2)
            );

            if (!settings.cl_crosshair_t) {
                ctx.fillRect(
                    (center.x - (crosshairWidth / 2)) - outlineThickness,
                    (center.y - ((adjustedLength + (crosshairWidth / 2) + crosshairGap))) - outlineThickness,
                    crosshairWidth + (outlineThickness * 2),
                    adjustedLength + (outlineThickness * 2)
                );
            }

            ctx.translate(-strokeTranslate, -strokeTranslate);
            ctx.translate(translate, translate);
        }

        ctx.fillStyle = crosshairColor;

        ctx.fillRect(
            center.x + ((crosshairWidth / 2) + crosshairGap),
            center.y - (crosshairWidth / 2),
            adjustedLength,
            crosshairWidth
        );

        ctx.fillRect(
            center.x - ((adjustedLength + (crosshairWidth / 2)) + crosshairGap),
            center.y - (crosshairWidth / 2),
            adjustedLength,
            crosshairWidth
        );

        ctx.fillRect(
            center.x - (crosshairWidth / 2),
            center.y + ((crosshairWidth / 2) + crosshairGap),
            crosshairWidth,
            adjustedLength
        );

        if (!settings.cl_crosshair_t) {
            ctx.fillRect(
                center.x - (crosshairWidth / 2),
                center.y - ((adjustedLength + (crosshairWidth / 2)) + crosshairGap),
                crosshairWidth,
                adjustedLength
            );
        }

        if (settings.cl_crosshairdot) {
            const dotWidth = crosshairWidth;
            const dotHeight = crosshairWidth;

            if (settings.cl_crosshair_drawoutline && outlineThickness > 0) {
                ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;

                const strokeTranslate = (crosshairWidth / 2) - Math.floor(crosshairWidth / 2);
                ctx.translate(-translate, -translate);
                ctx.translate(strokeTranslate, strokeTranslate);

                ctx.fillRect(
                    (center.x - (crosshairWidth / 2)) - outlineThickness,
                    (center.y - (crosshairWidth / 2)) - outlineThickness,
                    crosshairWidth + (outlineThickness * 2),
                    crosshairWidth + (outlineThickness * 2)
                );

                ctx.translate(-strokeTranslate, -strokeTranslate);
                ctx.translate(translate, translate);
            }

            ctx.fillStyle = crosshairColor;
            ctx.fillRect(
                center.x - (dotWidth / 2),
                center.y - (dotHeight / 2),
                dotWidth,
                dotHeight
            );
        }

        ctx.translate(-translate, -translate);

        return canvas;
    }
}

let renderer = new CS2CrosshairRenderer();
let originalSettings = null;
let currentSettings = null;
let isUsingCustomSettings = false;
let proPlayersData = null;
let selectedAutocompleteIndex = -1;

document.addEventListener('DOMContentLoaded', function () {
    originalSettings = renderer.parseCode(originalCode);
    currentSettings = { ...originalSettings };

    setupControls();
    updateControlsFromSettings(currentSettings);
    updateBackground();
    loadProPlayersData();
});

async function loadProPlayersData() {
    try {
        const response = await fetch('https://cdn.jsdelivr.net/gh/girlglock/cs2-crosshair@latest/remote-assets/static/pro-players.json');
        proPlayersData = await response.json();
    } catch (error) {
        console.error('failed to load pro-players.json:', error);
        proPlayersData = {};
    }
}

function setupControls() {
    const rangeInputs = document.querySelectorAll('input[type="range"]');
    rangeInputs.forEach(input => {
        const valueSpan = document.getElementById(input.id + '_value');

        input.addEventListener('input', function () {
            const value = parseFloat(this.value);
            valueSpan.textContent = value;
            currentSettings[this.id] = value;
            updateCrosshair();
        });
    });

    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            currentSettings[this.id] = this.checked;
            updateCrosshair();
        });
    });

    const selects = document.querySelectorAll('select');
    selects.forEach(select => {
        if (select.id.startsWith('cl_')) {
            const valueSpan = document.getElementById(select.id + '_value');
            select.addEventListener('change', function () {
                const value = parseInt(this.value);
                if (valueSpan) valueSpan.textContent = value;
                currentSettings[this.id] = value;
                updateCrosshair();
            });
        }
    });

    setupAutocomplete();
}

function setupAutocomplete() {
    const searchInput = document.getElementById('searchInput');
    const autocompleteResults = document.getElementById('autocompleteResults');

    searchInput.addEventListener('input', function () {
        const searchType = document.getElementById('searchType').value;
        if (searchType === 'proplayer' && proPlayersData) {
            showAutocomplete(this.value);
        } else {
            hideAutocomplete();
        }
    });

    searchInput.addEventListener('keydown', function (e) {
        const searchType = document.getElementById('searchType').value;
        if (searchType !== 'proplayer') return;

        const items = autocompleteResults.querySelectorAll('.autocomplete-item');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedAutocompleteIndex = Math.min(selectedAutocompleteIndex + 1, items.length - 1);
            updateAutocompleteSelection(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedAutocompleteIndex = Math.max(selectedAutocompleteIndex - 1, -1);
            updateAutocompleteSelection(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedAutocompleteIndex >= 0 && items[selectedAutocompleteIndex]) {
                selectAutocompleteItem(items[selectedAutocompleteIndex]);
            } else {
                goToSearch();
            }
        } else if (e.key === 'Escape') {
            hideAutocomplete();
            searchInput.blur();
        }
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.autocomplete-container')) {
            hideAutocomplete();
        }
    });
}

function showAutocomplete(query) {
    const autocompleteResults = document.getElementById('autocompleteResults');

    if (!query || query.length < 1) {
        hideAutocomplete();
        return;
    }

    const matches = findMatches(query, proPlayersData);

    if (matches.length === 0) {
        hideAutocomplete();
        return;
    }

    autocompleteResults.innerHTML = '';
    selectedAutocompleteIndex = -1; 

    matches.slice(0, 10).forEach((match, index) => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';

        const hasValidImage = false; //match.image && !match.image.includes('NoImage');
        const imageHtml = hasValidImage
            ? `<img src="${match.image}" class="autocomplete-img">`
            : '';

        item.innerHTML = `
            ${imageHtml}
            <span class="autocomplete-type">${match.type}</span> | 
            <span class="autocomplete-name">${match.name}</span> | 
            <span class="autocomplete-steamid">${match.steamid}</span>
        `;
        item.setAttribute('data-name', match.name);
        item.setAttribute('data-steamid', match.steamid);

        item.addEventListener('click', function () {
            selectAutocompleteItem(this);
        });

        autocompleteResults.appendChild(item);
    });

    autocompleteResults.style.display = 'block';
}

function hideAutocomplete() {
    const autocompleteResults = document.getElementById('autocompleteResults');
    autocompleteResults.style.display = 'none';
    selectedAutocompleteIndex = -1;
}

function updateAutocompleteSelection(items) {
    items.forEach((item, index) => {
        item.classList.toggle('selected', index === selectedAutocompleteIndex);
    });
}

function selectAutocompleteItem(item) {
    const name = item.getAttribute('data-name');
    const steamid = item.getAttribute('data-steamid');

    document.getElementById('searchInput').value = name;
    document.getElementById('searchInput').setAttribute('data-steamid', steamid);
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
        const valueSpan = document.getElementById(key + '_value');

        if (input) {
            if (input.type === 'range') {
                input.value = settings[key];
                if (valueSpan) valueSpan.textContent = settings[key];
            } else if (input.type === 'checkbox') {
                input.checked = settings[key];
            } else if (input.tagName === 'SELECT') {
                input.value = settings[key];
                const valueSpan = document.getElementById(key + '_value');
                if (valueSpan) valueSpan.textContent = settings[key];
            }
        }
    });
}

function updateCrosshair() {
    isUsingCustomSettings = true;

    const originalImage = document.getElementById('originalImage');
    const canvas = document.getElementById('crosshairCanvas');
    originalImage.style.display = 'none';
    canvas.style.display = '';

    const newCanvas = renderer.renderCrosshair(currentSettings, 64);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 64, 64);
    ctx.drawImage(newCanvas, 0, 0);

    const newCode = renderer.generateCode(currentSettings);
    document.getElementById('crosshairCode').value = newCode;
}

const backgrounds = [
    'https://raw.githubusercontent.com/girlglock/cs2-crosshair/refs/heads/main/remote-assets/overpass.png',
    'https://raw.githubusercontent.com/girlglock/cs2-crosshair/refs/heads/main/remote-assets/cache.jpg',
    'https://raw.githubusercontent.com/girlglock/cs2-crosshair/refs/heads/main/remote-assets/inferno.png',
    'https://raw.githubusercontent.com/girlglock/cs2-crosshair/refs/heads/main/remote-assets/nuke.png',
    'https://raw.githubusercontent.com/girlglock/cs2-crosshair/refs/heads/main/remote-assets/anubis.jpg'
];

let currentBackgroundIndex = 0;
const crosshairDiv = document.getElementById('crosshairImage');

function updateBackground() {
    const imageUrl = backgrounds[currentBackgroundIndex];
    const testImg = new Image();
    testImg.onload = function () {
        crosshairDiv.style.backgroundImage = `url('${imageUrl}')`;
    };
    testImg.onerror = function () {
        console.error('failed to load image:', imageUrl);
        crosshairDiv.style.backgroundImage = `url('https://files.catbox.moe/45rbkr.jpg')`;
    };
    testImg.src = imageUrl;
}

function prevBackground() {
    currentBackgroundIndex = (currentBackgroundIndex - 1 + backgrounds.length) % backgrounds.length;
    updateBackground();
}

function nextBackground() {
    currentBackgroundIndex = (currentBackgroundIndex + 1) % backgrounds.length;
    updateBackground();
}

updateBackground();

const searchCfg = {
    proplayer: {
        prefix: '',
        placeholder: '<pro_player>'
    },
    steamvanity: {
        prefix: 'https://steamcommunity.com/id/',
        placeholder: '<steam_vanity>'
    },
    steamid64: {
        prefix: 'https://steamcommunity.com/profiles/',
        placeholder: '<steamid64>'
    },
    leetify: {
        prefix: 'https://leetify.com/@',
        placeholder: '<leetify_handle>'
    }
};

const select = document.getElementById('searchType');
const prefixSpan = document.getElementById('inputPrefix');
const input = document.getElementById('searchInput');

function updatePrefix() {
    const config = searchCfg[select.value] || { prefix: '', placeholder: 'search...' };

    prefixSpan.textContent = config.prefix;
    input.placeholder = config.placeholder;
    input.removeAttribute('data-steamid');
    hideAutocomplete();

    if (config.prefix && select.value !== 'proplayer') {
        prefixSpan.style.visibility = 'hidden';
        prefixSpan.style.display = 'inline-block';
        const width = prefixSpan.offsetWidth;
        prefixSpan.style.visibility = '';
        prefixSpan.style.display = '';

        input.style.paddingLeft = (width + 6) + 'px';
    } else {
        input.style.paddingLeft = '8px';
    }

    input.value = '';
}

select.addEventListener('change', updatePrefix);

updatePrefix();

function goToSearch() {
    const inputElement = document.getElementById('searchInput');
    const input = inputElement.value.trim();
    const type = document.getElementById('searchType').value;

    if (!input) {
        alert('please enter someone to search');
        return;
    }

    const steamID64Pattern = /^7656119\d{10}$/;
    const allowedUsernamePattern = /^[a-zA-Z0-9_-]+$/;

    let path = '';

    if (type === 'proplayer') {
        const steamid = inputElement.getAttribute('data-steamid');
        if (steamid) {
            window.location.href = `https://c.girlglock.com/profiles/${steamid}`;
            return;
        } else if (proPlayersData && proPlayersData[input]) {
            const playerSteamId = proPlayersData[input].steamid;
            window.location.href = `https://c.girlglock.com/profiles/${playerSteamId}`;
            return;
        } else {
            alert('player not found.');
            return;
        }
    } else if (type === 'steamid64') {
        if (!steamID64Pattern.test(input)) {
            alert('invalid steamid64.');
            return;
        }
        path = `/profiles/${input}`;
    } else if (type === 'steamvanity') {
        if (!allowedUsernamePattern.test(input)) {
            alert('invalid steam vanity url.');
            return;
        }
        path = `/id/${input}`;
    } else if (type === 'leetify') {
        if (!allowedUsernamePattern.test(input)) {
            alert('invalid leetify handle.');
            return;
        }
        path = `/${input}`;
    }

    const baseDomain = window.location.origin;
    window.location.href = baseDomain + path;
}

function copyCode() {
    const code = document.getElementById('crosshairCode').value;
    navigator.clipboard.writeText(code).then(() => {
        alert('code copied :3c');
    }).catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('code copied :3c');
    });
}

function downloadImage() {
    let canvas;

    if (isUsingCustomSettings) {
        canvas = document.getElementById('crosshairCanvas');
    } else {
        canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        const img = document.getElementById('originalImage');

        const tempImg = new Image();
        tempImg.onload = function () {
            ctx.drawImage(tempImg, 0, 0);

            const link = document.createElement('a');
            link.download = document.getElementById('crosshairCode').value + '.png';
            link.href = canvas.toDataURL();
            link.click();
        };
        tempImg.src = img.src;
        return;
    }

    const link = document.createElement('a');
    link.download = document.getElementById('crosshairCode').value + '.png';
    link.href = canvas.toDataURL();
    link.click();
}

function shareCrosshair() {
    const code = document.getElementById('crosshairCode').value;
    const url = `${window.location.origin}/${code}`;

    if (navigator.share) {
        navigator.share({
            title: 'cs2-crosshair',
            text: 'wowie look at this crosshair',
            url: url
        });
    } else {
        navigator.clipboard.writeText(url).then(() => {
            alert('share link copied!');
        }).catch(() => {
            prompt('copy this link to share:', url);
        });
    }
}