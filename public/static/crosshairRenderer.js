(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = { CS2CrosshairRenderer: factory() };
    } else {
        root.CS2CrosshairRenderer = factory();
    }
})(typeof window !== "undefined" ? window : globalThis, function () {
    "use strict";

    function createBlankCanvas(width, height) {
        if (typeof document !== "undefined") {
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            return canvas;
        }
        const { createCanvas } = require("@napi-rs/canvas");
        return createCanvas(width, height);
    }

    class CS2CrosshairRenderer {
        constructor() {
            this.DICTIONARY = "ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789";
            this.DICTIONARY_LENGTH = this.DICTIONARY.length;
            this.CODE_PATTERN = /^CSGO(-[ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789]{5}){5}$/;

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

                if (!cleanCode.startsWith("CSGO-")) {
                    if (cleanCode.length === 25 && /^[ABCDEFGHJKLMNOPQRSTUVWXYZabcdefhijkmnopqrstuvwxyz23456789]+$/.test(cleanCode)) {
                        cleanCode = `CSGO-${cleanCode.slice(0, 5)}-${cleanCode.slice(5, 10)}-${cleanCode.slice(10, 15)}-${cleanCode.slice(15, 20)}-${cleanCode.slice(20)}`;
                    }
                }

                if (!this.CODE_PATTERN.test(cleanCode)) {
                    console.log("bad pattern, using default crosshair");
                    return this.defaultSettings;
                }

                const chars = cleanCode.slice(5).replace(/-/g, "");

                let num = BigInt(0);
                for (const char of chars.split("").reverse()) {
                    const index = this.DICTIONARY.indexOf(char);
                    if (index === -1) {
                        throw new Error(`invalid char: ${char}`);
                    }
                    num = num * BigInt(this.DICTIONARY_LENGTH) + BigInt(index);
                }

                const hexnum = num.toString(16).padStart(36, "0");
                const bytes = [];
                for (let i = 0; i < hexnum.length; i += 2) {
                    bytes.push(parseInt(hexnum.slice(i, i + 2), 16));
                }

                const checksum = bytes[0];
                const calculatedChecksum = bytes.slice(1).reduce((sum, byte) => sum + byte, 0) % 256;

                if (checksum !== calculatedChecksum) {
                    console.log("checksum failed, using default crosshair");
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
                console.error("parsing crosshair code error:", error);
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

                const hexString = bytes.map(b => b.toString(16).padStart(2, "0")).join("");
                let num = BigInt("0x" + hexString);

                let result = "";
                for (let i = 0; i < 25; i++) {
                    const remainder = Number(num % BigInt(this.DICTIONARY_LENGTH));
                    result += this.DICTIONARY[remainder];
                    num = num / BigInt(this.DICTIONARY_LENGTH);
                }

                return `CSGO-${result.slice(0, 5)}-${result.slice(5, 10)}-${result.slice(10, 15)}-${result.slice(15, 20)}-${result.slice(20)}`;

            } catch (error) {
                console.error("generating crosshair code error:", error);
                return "CSGO-ERROR-ERROR-ERROR-ERROR-ERROR";
            }
        }

        getColor(settings) {
            const colorIndex = settings.cl_crosshaircolor;

            if (colorIndex === 5) {
                return [settings.cl_crosshaircolor_r, settings.cl_crosshaircolor_g, settings.cl_crosshaircolor_b];
            }

            const presetColors = {
                0: [250, 50, 50],
                1: [50, 250, 50],
                2: [250, 250, 50],
                3: [50, 50, 250],
                4: [50, 250, 250]
            };

            return presetColors[colorIndex] || [50, 250, 50];
        }

        roundToEven(x) {
            const floor = Math.floor(x);
            const diff = x - floor;
            if (Math.abs(diff - 0.5) < 1e-9) {
                return (floor % 2 === 0) ? floor : floor + 1;
            }
            return Math.round(x);
        }

        renderCrosshair(settings, referenceHeight = 1080, spreadOverride = null, baseDistanceGoal = 4, minCanvasSize = 8) {
            const style = parseInt(settings.cl_crosshairstyle);

            if (style < 2) {
                return createBlankCanvas(minCanvasSize, minCanvasSize);
            }

            const yresScale = referenceHeight / 480;

            const barSize = this.roundToEven(settings.cl_crosshairsize * yresScale);
            const barThickness = Math.max(1, this.roundToEven(settings.cl_crosshairthickness * yresScale));
            const gap = Number(settings.cl_crosshairgap);
            const outlineThickness = settings.cl_crosshair_drawoutline ? settings.cl_crosshair_outlinethickness : 0;
            const halfThick = Math.trunc(barThickness / 2);

            let crosshairDistance;
            let outerDistance = null;
            let innerAlpha = 1;
            let outerAlpha = 1;
            let barSizeInner = barSize;
            let barSizeOuter = barSize;
            const showSplit = style === 2 && spreadOverride && spreadOverride.isSplit;

            if (style === 2 && spreadOverride && spreadOverride.distancePixels > 0) {
                const fullDistance = Math.trunc(spreadOverride.distancePixels + gap);
                if (showSplit) {
                    crosshairDistance = Math.trunc(spreadOverride.cappedDistancePixels + gap);
                    outerDistance = fullDistance;
                    innerAlpha = settings.cl_crosshair_dynamic_splitalpha_innermod;
                    outerAlpha = settings.cl_crosshair_dynamic_splitalpha_outermod;
                    const splitRatio = settings.cl_crosshair_dynamic_maxdist_splitratio;
                    barSizeInner = Math.ceil(barSize * (1 - splitRatio));
                    barSizeOuter = Math.floor(barSize * splitRatio);
                } else {
                    crosshairDistance = fullDistance;
                }
            } else {
                crosshairDistance = Math.trunc(baseDistanceGoal + gap);
            }

            const mainReach = crosshairDistance + halfThick + barSizeInner + outlineThickness;
            const outerReach = (showSplit && barSizeOuter > 0) ? (outerDistance + halfThick + barSizeInner + barSizeOuter + outlineThickness) : 0;
            const halfExtent = Math.max(mainReach, outerReach);
            const canvasSize = Math.max(minCanvasSize, Math.ceil(Math.abs(halfExtent)) * 2 + 4);

            const canvas = createBlankCanvas(canvasSize, canvasSize);
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvasSize, canvasSize);
            ctx.imageSmoothingEnabled = false;

            const center = { x: Math.floor(canvasSize / 2), y: Math.floor(canvasSize / 2) };
            const [r, g, b] = this.getColor(settings);
            const baseAlpha = settings.cl_crosshairusealpha ? settings.cl_crosshairalpha / 255 : 1;

            const drawRect = (x0, y0, x1, y1, alphaMultiplier = 1) => {
                const left = Math.min(x0, x1);
                const top = Math.min(y0, y1);
                const width = Math.abs(x1 - x0);
                const height = Math.abs(y1 - y0);
                const a = baseAlpha * alphaMultiplier;

                if (settings.cl_crosshair_drawoutline && outlineThickness > 0) {
                    const outLeft = Math.trunc(left - outlineThickness);
                    const outTop = Math.trunc(top - outlineThickness);
                    const outRight = Math.trunc(left + width + outlineThickness);
                    const outBottom = Math.trunc(top + height + outlineThickness);
                    ctx.fillStyle = `rgba(0, 0, 0, ${a})`;
                    ctx.fillRect(outLeft, outTop, outRight - outLeft, outBottom - outTop);
                }

                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
                ctx.fillRect(left, top, width, height);
            };

            const hy0 = center.y - halfThick;
            const hy1 = hy0 + barThickness;
            const vx0 = center.x - halfThick;
            const vx1 = vx0 + barThickness;

            if (showSplit) {
                const oInnerLeft = center.x - outerDistance - halfThick - barSizeInner;
                const oInnerRight = oInnerLeft + 2 * (outerDistance + barSizeInner) + barThickness;
                drawRect(oInnerLeft - barSizeOuter, hy0, oInnerLeft, hy1, outerAlpha);
                drawRect(oInnerRight, hy0, oInnerRight + barSizeOuter, hy1, outerAlpha);

                const oInnerTop = center.y - outerDistance - halfThick - barSizeInner;
                const oInnerBottom = oInnerTop + 2 * (outerDistance + barSizeInner) + barThickness;
                if (!settings.cl_crosshair_t) {
                    drawRect(vx0, oInnerTop - barSizeOuter, vx1, oInnerTop, outerAlpha);
                }
                drawRect(vx0, oInnerBottom, vx1, oInnerBottom + barSizeOuter, outerAlpha);
            }

            const innerLeft = center.x - crosshairDistance - halfThick;
            const innerRight = innerLeft + 2 * crosshairDistance + barThickness;
            drawRect(innerLeft - barSizeInner, hy0, innerLeft, hy1, innerAlpha);
            drawRect(innerRight, hy0, innerRight + barSizeInner, hy1, innerAlpha);

            const innerTop = center.y - crosshairDistance - halfThick;
            const innerBottom = innerTop + 2 * crosshairDistance + barThickness;
            if (!settings.cl_crosshair_t) {
                drawRect(vx0, innerTop - barSizeInner, vx1, innerTop, innerAlpha);
            }
            drawRect(vx0, innerBottom, vx1, innerBottom + barSizeInner, innerAlpha);

            if (settings.cl_crosshairdot) {
                drawRect(vx0, hy0, vx1, hy1);
            }

            return canvas;
        }
    }

    return CS2CrosshairRenderer;
});
