export function complementaryGrayscale(rgbString) {
    const match = rgbString.match(/\d+/g);
    if (!match) return "rgb(128, 128, 128)";
    const [r, g, b] = match.map(Number);
    const invR = 255 - r, invG = 255 - g, invB = 255 - b;
    const gray = Math.round(0.299 * invR + 0.587 * invG + 0.114 * invB);
    return `rgb(${gray}, ${gray}, ${gray})`;
}

export function createIconLink(href, imgSrc, linkStyle) {
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

export function renderPlayerInfo(data, colorRGB) {
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

    if (data.avatarUrl) {
        const avatar = document.createElement("img");
        avatar.src = data.avatarUrl;
        avatar.alt = "";
        avatar.style.cssText = "width: 48px; height: 48px; margin-right: 4px; vertical-align: middle;";
        span.appendChild(avatar);
    }

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

export function renderStats(data) {
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
