(() => {
    "use strict";

    const STORAGE_KEY = "verger-infini-save-v2";
    const TICK_MS = 100;

    const state = {
        apples: 0,
        stage: 0,
        owned: {},
        lastTick: Date.now(),
    };

    /**
     * @typedef {object} UpgradeDef
     * @property {string} id
     * @property {string} name
     * @property {string} desc
     * @property {number} baseCost
     * @property {number} costGrowth
     * @property {number|null} nb_max  null = illimité ; sinon disparaît après nb_max achats
     * @property {number} stage  stage_needed — visible si current_stage > stage
     * @property {number} [clickBonus]
     * @property {number} [cps]
     * @property {string} [onBuy]  nom d'effet dans EFFECTS
     */

    /** @type {Record<string, (upgrade: UpgradeDef) => void>} */
    const EFFECTS = {
        advanceStage() {
            state.stage += 1;
        },
        advanceStage2() {
            state.stage += 2;
        },
        grantApples100() {
            state.apples += 100;
        },
    };

    /**
     * Appelle l'effet nommé sur l'upgrade (si défini).
     * @param {UpgradeDef} upgrade
     */
    function callUpgradeEffect(upgrade) {
        if (!upgrade.onBuy) return;
        const fn = EFFECTS[upgrade.onBuy];
        if (typeof fn === "function") {
            fn(upgrade);
        }
    }

    /** @type {UpgradeDef[]} */
    const UPGRADES = [
        {
            id: "panier",
            name: "Panier en osier",
            desc: "+1 pomme par cueillette",
            baseCost: 15,
            costGrowth: 1.15,
            nb_max: null,
            stage: -1,
            clickBonus: 1,
            onBuy: null,
        },
        {
            id: "golden",
            name: "Pommier Golden",
            desc: "+0.5 pomme / s — variété douce",
            baseCost: 50,
            costGrowth: 1.18,
            nb_max: null,
            stage: -1,
            cps: 0.5,
            onBuy: null,
        },
        {
            id: "ouverture",
            name: "Ouverture du verger",
            desc: "Passe au stage suivant (achat unique)",
            baseCost: 100,
            costGrowth: 1,
            nb_max: 1,
            stage: -1,
            onBuy: "advanceStage",
        },
        {
            id: "granny",
            name: "Granny Smith",
            desc: "+2 pommes / s — variété acidulée",
            baseCost: 200,
            costGrowth: 1.2,
            nb_max: null,
            stage: 0,
            cps: 2,
            onBuy: null,
        },
        {
            id: "echelle",
            name: "Échelle de verger",
            desc: "+5 pommes par cueillette",
            baseCost: 500,
            costGrowth: 1.22,
            nb_max: null,
            stage: 0,
            clickBonus: 5,
            onBuy: null,
        },
        {
            id: "expansion",
            name: "Expansion des parcelles",
            desc: "Débloque les variétés avancées (achat unique)",
            baseCost: 2000,
            costGrowth: 1,
            nb_max: 1,
            stage: 0,
            onBuy: "advanceStage",
        },
        {
            id: "gala",
            name: "Rangée de Gala",
            desc: "+10 pommes / s — variété croquante",
            baseCost: 1500,
            costGrowth: 1.22,
            nb_max: null,
            stage: 1,
            cps: 10,
            onBuy: null,
        },
        {
            id: "reinette",
            name: "Verger de Reinettes",
            desc: "+50 pommes / s — variété ancienne",
            baseCost: 8000,
            costGrowth: 1.25,
            nb_max: null,
            stage: 1,
            cps: 50,
            onBuy: null,
        },
        {
            id: "cidrerie",
            name: "Petite cidrerie",
            desc: "+120 pommes / s — transformation",
            baseCost: 25000,
            costGrowth: 1.28,
            nb_max: null,
            stage: 1,
            cps: 120,
            onBuy: null,
        },
        {
            id: "bonus_pommes",
            name: "Récolte surprise",
            desc: "+100 pommes immédiates (×3 max)",
            baseCost: 75,
            costGrowth: 1.5,
            nb_max: 3,
            stage: -1,
            onBuy: "grantApples100",
        },
    ];

    for (const u of UPGRADES) {
        state.owned[u.id] = 0;
    }

    const els = {
        apples: document.getElementById("apples"),
        perClick: document.getElementById("per-click"),
        perSecond: document.getElementById("per-second"),
        treeBtn: document.getElementById("tree-btn"),
        shopList: document.getElementById("shop-list"),
        floating: document.getElementById("floating-layer"),
        resetBtn: document.getElementById("reset-btn"),
    };

    function formatNumber(n) {
        if (n >= 1_000_000) {
            return (n / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + "M";
        }
        if (n >= 10_000) {
            return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
        }
        if (n >= 1000) {
            return n.toFixed(0);
        }
        if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 0.05) {
            return String(Math.round(n));
        }
        return n.toFixed(1);
    }

    function getOwned(id) {
        return state.owned[id] || 0;
    }

    /** Visible si current_stage > stage_needed et pas encore au nb_max. */
    function isUpgradeAvailable(upgrade) {
        if (!(state.stage > upgrade.stage)) return false;
        if (upgrade.nb_max != null && getOwned(upgrade.id) >= upgrade.nb_max) {
            return false;
        }
        return true;
    }

    function costOf(upgrade) {
        const owned = getOwned(upgrade.id);
        return Math.floor(upgrade.baseCost * Math.pow(upgrade.costGrowth, owned));
    }

    function perClick() {
        let value = 1;
        for (const u of UPGRADES) {
            if (u.clickBonus) {
                value += u.clickBonus * getOwned(u.id);
            }
        }
        return value;
    }

    function perSecond() {
        let value = 0;
        for (const u of UPGRADES) {
            if (u.cps) {
                value += u.cps * getOwned(u.id);
            }
        }
        return value;
    }

    function save() {
        const payload = {
            apples: state.apples,
            stage: state.stage,
            owned: state.owned,
            savedAt: Date.now(),
        };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (_) {
            /* ignore quota / private mode */
        }
    }

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);
            if (typeof data.apples === "number" && data.apples >= 0) {
                state.apples = data.apples;
            }
            if (typeof data.stage === "number" && data.stage >= 0) {
                state.stage = Math.floor(data.stage);
            }
            if (data.owned && typeof data.owned === "object") {
                for (const u of UPGRADES) {
                    const n = data.owned[u.id];
                    if (typeof n === "number" && n >= 0) {
                        state.owned[u.id] = Math.floor(n);
                    }
                }
            }
            if (typeof data.savedAt === "number") {
                const elapsedSec = Math.max(0, (Date.now() - data.savedAt) / 1000);
                const offlineGain = Math.min(elapsedSec, 8 * 3600) * perSecond();
                state.apples += offlineGain;
            }
        } catch (_) {
            /* ignore corrupt save */
        }
    }

    function spawnFloat(amount, clientX, clientY) {
        const rect = els.floating.getBoundingClientRect();
        const node = document.createElement("span");
        node.className = "float-apple";
        node.textContent = "+" + formatNumber(amount) + " 🍎";
        node.style.left = `${clientX - rect.left - 12}px`;
        node.style.top = `${clientY - rect.top - 10}px`;
        els.floating.appendChild(node);
        node.addEventListener("animationend", () => node.remove());
    }

    function renderStats() {
        els.apples.textContent = formatNumber(state.apples);
        els.perClick.textContent = formatNumber(perClick());
        els.perSecond.textContent = formatNumber(perSecond());
    }

    function renderShop() {
        const availableIds = new Set(
            UPGRADES.filter(isUpgradeAvailable).map((u) => u.id),
        );
        const existing = new Set(
            [...els.shopList.querySelectorAll("[data-id]")].map(
                (el) => el.dataset.id,
            ),
        );

        // Rebuild if the set of visible upgrades changed (stage / nb_max).
        let same =
            availableIds.size === existing.size &&
            [...availableIds].every((id) => existing.has(id));
        if (!same) {
            buildShop();
            return;
        }

        for (const u of UPGRADES) {
            if (!availableIds.has(u.id)) continue;
            const row = els.shopList.querySelector(`[data-id="${u.id}"]`);
            if (!row) continue;
            const owned = getOwned(u.id);
            const cost = costOf(u);
            const maxLabel =
                u.nb_max != null ? ` / ${u.nb_max}` : "";
            row.querySelector(".owned-count").textContent =
                String(owned) + maxLabel;
            row.querySelector(".price").textContent = formatNumber(cost);
            row.querySelector(".buy-btn").disabled = state.apples < cost;
        }
    }

    function buildShop() {
        els.shopList.innerHTML = "";
        for (const u of UPGRADES) {
            if (!isUpgradeAvailable(u)) continue;
            const li = document.createElement("li");
            li.className = "shop-item";
            li.dataset.id = u.id;
            const maxLabel = u.nb_max != null ? ` / ${u.nb_max}` : "";
            li.innerHTML = `
                <span class="shop-item-name">${u.name}</span>
                <span class="shop-item-meta">×<span class="owned-count">0${maxLabel}</span></span>
                <p class="shop-item-desc">${u.desc}</p>
                <button type="button" class="buy-btn">
                    Acheter — <span class="price">0</span> 🍎
                </button>
            `;
            li.querySelector(".buy-btn").addEventListener("click", () => buy(u.id));
            els.shopList.appendChild(li);
        }
        // Refresh prices / disabled state without rebuilding again.
        for (const u of UPGRADES) {
            if (!isUpgradeAvailable(u)) continue;
            const row = els.shopList.querySelector(`[data-id="${u.id}"]`);
            if (!row) continue;
            const owned = getOwned(u.id);
            const cost = costOf(u);
            const maxLabel = u.nb_max != null ? ` / ${u.nb_max}` : "";
            row.querySelector(".owned-count").textContent =
                String(owned) + maxLabel;
            row.querySelector(".price").textContent = formatNumber(cost);
            row.querySelector(".buy-btn").disabled = state.apples < cost;
        }
    }

    function buy(id) {
        const upgrade = UPGRADES.find((u) => u.id === id);
        if (!upgrade || !isUpgradeAvailable(upgrade)) return;
        const cost = costOf(upgrade);
        if (state.apples < cost) return;

        state.apples -= cost;
        state.owned[id] = getOwned(id) + 1;
        callUpgradeEffect(upgrade);

        save();
        renderStats();
        renderShop();
    }

    function pickApple(event) {
        const gain = perClick();
        state.apples += gain;
        els.treeBtn.classList.add("is-pressed");
        window.setTimeout(() => els.treeBtn.classList.remove("is-pressed"), 80);

        const x = event.clientX ?? els.treeBtn.getBoundingClientRect().left + 80;
        const y = event.clientY ?? els.treeBtn.getBoundingClientRect().top + 80;
        spawnFloat(gain, x, y);

        save();
        renderStats();
        renderShop();
    }

    function tick() {
        const now = Date.now();
        const dt = (now - state.lastTick) / 1000;
        state.lastTick = now;
        const cps = perSecond();
        if (cps > 0 && dt > 0) {
            state.apples += cps * dt;
            renderStats();
            renderShop();
        }
    }

    function reset() {
        if (!window.confirm("Réinitialiser tout le verger ?")) return;
        state.apples = 0;
        state.stage = 0;
        for (const u of UPGRADES) {
            state.owned[u.id] = 0;
        }
        localStorage.removeItem(STORAGE_KEY);
        renderStats();
        buildShop();
    }

    load();
    buildShop();
    renderStats();
    renderShop();

    els.treeBtn.addEventListener("click", pickApple);
    els.resetBtn.addEventListener("click", reset);

    window.setInterval(tick, TICK_MS);
    window.setInterval(save, 5000);
    window.addEventListener("beforeunload", save);
})();
