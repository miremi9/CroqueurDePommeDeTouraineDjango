(() => {
    "use strict";

    const STORAGE_KEY = "verger-infini-save-v3";
    const TICK_MS = 100;
    const CUTTING_CPS = 0.25;
    const BOUTURE_COST = 40;

    const state = {
        apples: 0,
        stage: 0,
        owned: {},
        cuttings: 0,
        tools: {
            bouture: false,
            arroser: false,
            engrais: false,
        },
        /** @type {Record<string, number>} timestamps ms until ready */
        toolReadyAt: {
            bouture: 0,
            arroser: 0,
            engrais: 0,
        },
        /** buffs expire timestamps */
        waterUntil: 0,
        fertilizerUntil: 0,
        lastTick: Date.now(),
    };

    /**
     * @typedef {object} UpgradeDef
     * @property {string} id
     * @property {string} name
     * @property {string} desc
     * @property {number} baseCost
     * @property {number} costGrowth
     * @property {number|null} nb_max
     * @property {number} stage
     * @property {number} [clickBonus]
     * @property {number} [cps]
     * @property {string|null} [onBuy]
     */

    /**
     * @typedef {object} ToolDef
     * @property {string} id
     * @property {string} name
     * @property {string} desc
     * @property {string} unlockUpgradeId
     * @property {number} cooldownSec
     * @property {string} actionLabel
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
        unlockBouture() {
            state.tools.bouture = true;
        },
        unlockArroser() {
            state.tools.arroser = true;
        },
        unlockEngrais() {
            state.tools.engrais = true;
        },
    };

    /**
     * @param {UpgradeDef} upgrade
     */
    function callUpgradeEffect(upgrade) {
        if (!upgrade.onBuy) return;
        const fn = EFFECTS[upgrade.onBuy];
        if (typeof fn === "function") {
            fn(upgrade);
        }
    }

    /** @type {ToolDef[]} */
    const TOOLS = [
        {
            id: "bouture",
            name: "Bouture",
            desc: `Plante une bouture (+${CUTTING_CPS} pomme/s permanente). Coût : ${BOUTURE_COST} 🍎`,
            unlockUpgradeId: "outil_bouture",
            cooldownSec: 20,
            actionLabel: "Faire une bouture",
        },
        {
            id: "arroser",
            name: "Arroser",
            desc: "Double les pommes par clic pendant 12 s",
            unlockUpgradeId: "outil_arrosoir",
            cooldownSec: 30,
            actionLabel: "Arroser le verger",
        },
        {
            id: "engrais",
            name: "Engrais",
            desc: "×2 production / s pendant 20 s",
            unlockUpgradeId: "outil_engrais",
            cooldownSec: 45,
            actionLabel: "Mettre de l'engrais",
        },
    ];

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
            id: "outil_arrosoir",
            name: "Arrosoir",
            desc: "Débloque l'outil Arroser (onglet Outils)",
            baseCost: 80,
            costGrowth: 1,
            nb_max: 1,
            stage: -1,
            onBuy: "unlockArroser",
        },
        {
            id: "outil_bouture",
            name: "Sécateur à greffer",
            desc: "Débloque l'outil Bouture (onglet Outils)",
            baseCost: 120,
            costGrowth: 1,
            nb_max: 1,
            stage: -1,
            onBuy: "unlockBouture",
        },
        {
            id: "outil_engrais",
            name: "Sac d'engrais",
            desc: "Débloque l'outil Engrais (onglet Outils)",
            baseCost: 250,
            costGrowth: 1,
            nb_max: 1,
            stage: -1,
            onBuy: "unlockEngrais",
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
        cuttings: document.getElementById("cuttings"),
        treeBtn: document.getElementById("tree-btn"),
        shopList: document.getElementById("shop-list"),
        toolsList: document.getElementById("tools-list"),
        toolsPanel: document.getElementById("tools-panel"),
        buffBar: document.getElementById("buff-bar"),
        floating: document.getElementById("floating-layer"),
        resetBtn: document.getElementById("reset-btn"),
        gameRoot: document.querySelector(".game"),
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

    function isToolUnlocked(toolId) {
        return Boolean(state.tools[toolId]);
    }

    function cooldownLeft(toolId) {
        return Math.max(0, state.toolReadyAt[toolId] - Date.now());
    }

    function basePerClick() {
        let value = 1;
        for (const u of UPGRADES) {
            if (u.clickBonus) {
                value += u.clickBonus * getOwned(u.id);
            }
        }
        return value;
    }

    function basePerSecond() {
        let value = 0;
        for (const u of UPGRADES) {
            if (u.cps) {
                value += u.cps * getOwned(u.id);
            }
        }
        value += state.cuttings * CUTTING_CPS;
        return value;
    }

    function waterActive() {
        return Date.now() < state.waterUntil;
    }

    function fertilizerActive() {
        return Date.now() < state.fertilizerUntil;
    }

    function perClick() {
        let value = basePerClick();
        if (waterActive()) value *= 2;
        return value;
    }

    function perSecond() {
        let value = basePerSecond();
        if (fertilizerActive()) value *= 2;
        return value;
    }

    function save() {
        const payload = {
            apples: state.apples,
            stage: state.stage,
            owned: state.owned,
            cuttings: state.cuttings,
            tools: state.tools,
            toolReadyAt: state.toolReadyAt,
            waterUntil: state.waterUntil,
            fertilizerUntil: state.fertilizerUntil,
            savedAt: Date.now(),
        };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (_) {
            /* ignore */
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
            if (typeof data.cuttings === "number" && data.cuttings >= 0) {
                state.cuttings = Math.floor(data.cuttings);
            }
            if (data.tools && typeof data.tools === "object") {
                for (const id of Object.keys(state.tools)) {
                    state.tools[id] = Boolean(data.tools[id]);
                }
            }
            if (data.toolReadyAt && typeof data.toolReadyAt === "object") {
                for (const id of Object.keys(state.toolReadyAt)) {
                    const n = data.toolReadyAt[id];
                    if (typeof n === "number") state.toolReadyAt[id] = n;
                }
            }
            if (typeof data.waterUntil === "number") {
                state.waterUntil = data.waterUntil;
            }
            if (typeof data.fertilizerUntil === "number") {
                state.fertilizerUntil = data.fertilizerUntil;
            }
            if (data.owned && typeof data.owned === "object") {
                for (const u of UPGRADES) {
                    const n = data.owned[u.id];
                    if (typeof n === "number" && n >= 0) {
                        state.owned[u.id] = Math.floor(n);
                    }
                }
            }
            // Sync unlocks from owned shop items (in case onBuy was missed).
            if (getOwned("outil_bouture") > 0) state.tools.bouture = true;
            if (getOwned("outil_arrosoir") > 0) state.tools.arroser = true;
            if (getOwned("outil_engrais") > 0) state.tools.engrais = true;

            if (typeof data.savedAt === "number") {
                const elapsedSec = Math.max(0, (Date.now() - data.savedAt) / 1000);
                const offlineGain = Math.min(elapsedSec, 8 * 3600) * basePerSecond();
                state.apples += offlineGain;
            }
        } catch (_) {
            /* ignore */
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

    function renderBuffs() {
        const chips = [];
        if (waterActive()) {
            const s = Math.ceil((state.waterUntil - Date.now()) / 1000);
            chips.push(`<span class="buff-chip is-water">💧 Arrosage ×2 clic (${s}s)</span>`);
        }
        if (fertilizerActive()) {
            const s = Math.ceil((state.fertilizerUntil - Date.now()) / 1000);
            chips.push(`<span class="buff-chip is-fertilizer">🧪 Engrais ×2 /s (${s}s)</span>`);
        }
        if (chips.length === 0) {
            els.buffBar.hidden = true;
            els.buffBar.innerHTML = "";
            return;
        }
        els.buffBar.hidden = false;
        els.buffBar.innerHTML = chips.join("");
    }

    function renderStats() {
        els.apples.textContent = formatNumber(state.apples);
        els.perClick.textContent = formatNumber(perClick());
        els.perSecond.textContent = formatNumber(perSecond());
        els.cuttings.textContent = String(state.cuttings);
        renderBuffs();
    }

    function renderTools() {
        const unlocked = TOOLS.filter((t) => isToolUnlocked(t.id));
        const anyUnlocked = unlocked.length > 0;

        els.toolsPanel.hidden = !anyUnlocked;
        els.gameRoot.classList.toggle("has-tools", anyUnlocked);

        const visibleIds = new Set(unlocked.map((t) => t.id));
        const existingIds = new Set(
            [...els.toolsList.querySelectorAll("[data-tool]")].map(
                (el) => el.dataset.tool,
            ),
        );
        const same =
            visibleIds.size === existingIds.size &&
            [...visibleIds].every((id) => existingIds.has(id));
        if (!same) {
            buildTools();
            return;
        }

        for (const tool of unlocked) {
            const row = els.toolsList.querySelector(`[data-tool="${tool.id}"]`);
            if (!row) continue;
            const btn = row.querySelector(".tool-btn");
            const meta = row.querySelector(".tool-meta");
            const left = cooldownLeft(tool.id);

            if (tool.id === "bouture" && state.apples < BOUTURE_COST) {
                btn.disabled = true;
                btn.textContent = `Pas assez (${BOUTURE_COST} 🍎)`;
                meta.textContent = "Prêt";
            } else if (left > 0) {
                btn.disabled = true;
                btn.textContent = `Cooldown ${Math.ceil(left / 1000)}s`;
                meta.textContent = "En recharge…";
            } else {
                btn.disabled = false;
                btn.textContent = tool.actionLabel;
                meta.textContent = `Cooldown : ${tool.cooldownSec}s`;
            }
        }
    }

    function buildTools() {
        els.toolsList.innerHTML = "";
        for (const tool of TOOLS) {
            if (!isToolUnlocked(tool.id)) continue;
            const li = document.createElement("li");
            li.className = "tool-item";
            li.dataset.tool = tool.id;
            li.innerHTML = `
                <span class="tool-item-name">${tool.name}</span>
                <p class="tool-item-desc">${tool.desc}</p>
                <span class="tool-meta"></span>
                <button type="button" class="tool-btn"></button>
            `;
            li.querySelector(".tool-btn").addEventListener("click", () => useTool(tool.id));
            els.toolsList.appendChild(li);
        }

        const anyUnlocked = TOOLS.some((t) => isToolUnlocked(t.id));
        els.toolsPanel.hidden = !anyUnlocked;
        els.gameRoot.classList.toggle("has-tools", anyUnlocked);

        // Refresh button labels without triggering another rebuild.
        for (const tool of TOOLS) {
            if (!isToolUnlocked(tool.id)) continue;
            const row = els.toolsList.querySelector(`[data-tool="${tool.id}"]`);
            if (!row) continue;
            const btn = row.querySelector(".tool-btn");
            const meta = row.querySelector(".tool-meta");
            const left = cooldownLeft(tool.id);
            if (tool.id === "bouture" && state.apples < BOUTURE_COST) {
                btn.disabled = true;
                btn.textContent = `Pas assez (${BOUTURE_COST} 🍎)`;
                meta.textContent = "Prêt";
            } else if (left > 0) {
                btn.disabled = true;
                btn.textContent = `Cooldown ${Math.ceil(left / 1000)}s`;
                meta.textContent = "En recharge…";
            } else {
                btn.disabled = false;
                btn.textContent = tool.actionLabel;
                meta.textContent = `Cooldown : ${tool.cooldownSec}s`;
            }
        }
    }

    function useTool(toolId) {
        const tool = TOOLS.find((t) => t.id === toolId);
        if (!tool || !isToolUnlocked(toolId)) return;
        if (cooldownLeft(toolId) > 0) return;

        if (toolId === "bouture") {
            if (state.apples < BOUTURE_COST) return;
            state.apples -= BOUTURE_COST;
            state.cuttings += 1;
            state.toolReadyAt.bouture = Date.now() + tool.cooldownSec * 1000;
        } else if (toolId === "arroser") {
            state.waterUntil = Date.now() + 12_000;
            state.toolReadyAt.arroser = Date.now() + tool.cooldownSec * 1000;
        } else if (toolId === "engrais") {
            state.fertilizerUntil = Date.now() + 20_000;
            state.toolReadyAt.engrais = Date.now() + tool.cooldownSec * 1000;
        }

        save();
        renderStats();
        renderTools();
        renderShop();
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

        const same =
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
            const maxLabel = u.nb_max != null ? ` / ${u.nb_max}` : "";
            row.querySelector(".owned-count").textContent = String(owned) + maxLabel;
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
        for (const u of UPGRADES) {
            if (!isUpgradeAvailable(u)) continue;
            const row = els.shopList.querySelector(`[data-id="${u.id}"]`);
            if (!row) continue;
            const owned = getOwned(u.id);
            const cost = costOf(u);
            const maxLabel = u.nb_max != null ? ` / ${u.nb_max}` : "";
            row.querySelector(".owned-count").textContent = String(owned) + maxLabel;
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
        renderTools();
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
        renderTools();
    }

    function tick() {
        const now = Date.now();
        const dt = (now - state.lastTick) / 1000;
        state.lastTick = now;
        const cps = perSecond();
        if (cps > 0 && dt > 0) {
            state.apples += cps * dt;
        }
        renderStats();
        renderShop();
        renderTools();
    }

    function reset() {
        if (!window.confirm("Réinitialiser tout le verger ?")) return;
        state.apples = 0;
        state.stage = 0;
        state.cuttings = 0;
        state.waterUntil = 0;
        state.fertilizerUntil = 0;
        for (const u of UPGRADES) {
            state.owned[u.id] = 0;
        }
        for (const id of Object.keys(state.tools)) {
            state.tools[id] = false;
            state.toolReadyAt[id] = 0;
        }
        localStorage.removeItem(STORAGE_KEY);
        renderStats();
        buildShop();
        renderTools();
    }

    load();
    buildTools();
    buildShop();
    renderStats();
    renderShop();
    renderTools();

    els.treeBtn.addEventListener("click", pickApple);
    els.resetBtn.addEventListener("click", reset);

    window.setInterval(tick, TICK_MS);
    window.setInterval(save, 5000);
    window.addEventListener("beforeunload", save);
})();
