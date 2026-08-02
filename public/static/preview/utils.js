export function updateUrlParams(updates) {
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

export function isAnimatedCrosshairStyle(settings) {
    return parseInt(settings.cl_crosshairstyle) === 2;
}

export function rgbToHex(r, g, b) {
    const toHex = n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function getTimeAgo(dateString, forceDays = false) {
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

export function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}

export function resizeBilinear(srcCanvas, destWidth, destHeight) {
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

export function sharpenCanvas(canvas, amount = SHARPEN_AMOUNT, radius = SHARPEN_RADIUS) {
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
