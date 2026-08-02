export class PlayerAutocomplete {
    constructor() {
        this.searchTypeEl = document.getElementById("searchType");
        this.prefixEl = document.getElementById("inputPrefix");
        this.inputEl = document.getElementById("searchInput");
        this.resultsEl = document.getElementById("autocompleteResults");

        this.proPlayersData = null;
        this.selectedIndex = -1;

        this.searchCfg = {
            proplayer: { prefix: "", placeholder: "<pro_player>" },
            steamvanity: { prefix: "https://steamcommunity.com/id/", placeholder: "<steam_vanity>" },
            steamid64: { prefix: "https://steamcommunity.com/profiles/", placeholder: "<steamid64>" },
            leetify: { prefix: "https://leetify.com/@", placeholder: "<leetify_handle>" }
        };
    }

    async loadProPlayersData() {
        try {
            const response = await fetch("/static/assets/pro-players.json");
            this.proPlayersData = await response.json();
        } catch (error) {
            console.error("failed to load pro-players.json:", error);
            this.proPlayersData = {};
        }
    }

    updatePrefix() {
        const cfg = this.searchCfg[this.searchTypeEl.value] || { prefix: "", placeholder: "search..." };

        this.prefixEl.textContent = cfg.prefix;
        this.inputEl.placeholder = cfg.placeholder;
        this.inputEl.removeAttribute("data-steamid");
        this.hideAutocomplete();

        if (cfg.prefix && this.searchTypeEl.value !== "proplayer") {
            this.prefixEl.style.visibility = "hidden";
            this.prefixEl.style.display = "inline-block";
            const width = this.prefixEl.offsetWidth;
            this.prefixEl.style.visibility = "";
            this.prefixEl.style.display = "";
            this.inputEl.style.paddingLeft = (width + 6) + "px";
        } else {
            this.inputEl.style.paddingLeft = "8px";
        }

        this.inputEl.value = "";
    }

    setup() {
        this.searchTypeEl.addEventListener("change", () => this.updatePrefix());
        this.updatePrefix();

        this.inputEl.addEventListener("input", () => {
            const searchType = this.searchTypeEl.value;
            if (searchType === "proplayer" && this.proPlayersData) {
                this.showAutocomplete(this.inputEl.value);
            } else {
                this.hideAutocomplete();
            }
        });

        this.inputEl.addEventListener("keydown", (e) => {
            const searchType = this.searchTypeEl.value;

            if (searchType === "proplayer") {
                const items = this.resultsEl.querySelectorAll(".autocomplete-item");

                if (e.key === "ArrowDown") {
                    e.preventDefault();
                    this.selectedIndex = Math.min(this.selectedIndex + 1, items.length - 1);
                    this.updateAutocompleteSelection(items);
                    return;
                } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                    this.updateAutocompleteSelection(items);
                    return;
                } else if (e.key === "Enter") {
                    e.preventDefault();
                    if (this.selectedIndex >= 0 && items[this.selectedIndex]) {
                        this.selectAutocompleteItem(items[this.selectedIndex]);
                    } else {
                        this.goToSearch();
                    }
                    return;
                } else if (e.key === "Escape") {
                    this.hideAutocomplete();
                    this.inputEl.blur();
                    return;
                }
            }

            if (e.key === "Enter") {
                e.preventDefault();
                this.goToSearch();
            }
        });

        document.addEventListener("click", (e) => {
            if (!e.target.closest(".autocomplete-container")) {
                this.hideAutocomplete();
            }
        });
    }

    showAutocomplete(query) {
        if (!query || query.length < 1) {
            this.hideAutocomplete();
            return;
        }

        const matches = this.findMatches(query);
        if (matches.length === 0) {
            this.hideAutocomplete();
            return;
        }

        this.resultsEl.innerHTML = "";
        this.selectedIndex = -1;

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

            item.addEventListener("click", () => {
                this.selectAutocompleteItem(item);
            });

            this.resultsEl.appendChild(item);
        });

        this.resultsEl.style.display = "block";
    }

    hideAutocomplete() {
        this.resultsEl.style.display = "none";
        this.selectedIndex = -1;
    }

    updateAutocompleteSelection(items) {
        items.forEach((item, index) => {
            item.classList.toggle("selected", index === this.selectedIndex);
        });
    }

    selectAutocompleteItem(item) {
        const name = item.getAttribute("data-name");
        const steamid = item.getAttribute("data-steamid");

        this.inputEl.value = name;
        this.inputEl.setAttribute("data-steamid", steamid);
        this.hideAutocomplete();
    }

    findMatches(query) {
        const matches = [];
        const queryLower = query.toLowerCase();

        for (const [name, data] of Object.entries(this.proPlayersData.players)) {
            if (name.toLowerCase().includes(queryLower)) {
                matches.push({
                    name,
                    steamid: data.steamid,
                    type: data.type,
                    image: data.image,
                    relevance: this.calculateRelevance(name.toLowerCase(), queryLower)
                });
            }
        }

        matches.sort((a, b) => b.relevance - a.relevance);
        return matches;
    }

    calculateRelevance(name, query) {
        if (name === query) return 1000;
        if (name.startsWith(query)) return 500;
        return 100 / (name.indexOf(query) + 1);
    }

    goToSearch() {
        const searchValue = this.inputEl.value.trim();
        const type = this.searchTypeEl.value;

        if (!searchValue) {
            alert("please enter someone to search");
            return;
        }

        const steamID64Pattern = /^7656119\d{10}$/;
        const allowedUsernamePattern = /^[a-zA-Z0-9_-]+$/;
        const baseDomain = window.location.origin;

        let path = "";

        if (type === "proplayer") {
            const steamid = this.inputEl.getAttribute("data-steamid");
            if (steamid) {
                path = `/profiles/${steamid}`;
            } else if (this.proPlayersData && this.proPlayersData.players && this.proPlayersData.players[searchValue]) {
                path = `/profiles/${this.proPlayersData.players[searchValue].steamid}`;
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
}
