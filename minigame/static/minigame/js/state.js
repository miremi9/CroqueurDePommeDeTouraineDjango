"use strict";

/**
 * Mutable game state, persistence (save/load) and the pure calculations
 * derived from it (costs, production rates, availability...).
 */

import { STORAGE_KEY, UPGRADES, BOUTURE_TYPES, TREE_MULTIPLIER_PER_CUTTING } from "./config.js";

const BOUTURE_BY_ID = new Map(BOUTURE_TYPES.map((t) => [t.id, t]));

/** @typedef {{ id: string, cuttings: Record<string, number> }} Tree */

export const state = {
    apples: 0,
    stage: 0,
    owned: {},
    /** @type {Tree[]} */
    trees: [{ id: "base", cuttings: {} }],
    tools: {
        arroser: false,
        engrais: false,
    },
    /** @type {Record<string, boolean>} unlocked bouture types, keyed by BOUTURE_TYPES id */
    boutureTypes: Object.fromEntries(BOUTURE_TYPES.map((t) => [t.id, false])),
    /** @type {Record<string, number>} timestamps (ms) at which each tool/bouture cooldown ends */
    toolReadyAt: {
        arroser: 0,
        engrais: 0,
        ...Object.fromEntries(BOUTURE_TYPES.map((t) => [`bouture_${t.id}`, 0])),
    },
    /** buff expiry timestamps (ms) */
    waterUntil: 0,
    fertilizerUntil: 0,
    lastTick: Date.now(),
};

for (const u of UPGRADES) {
    state.owned[u.id] = 0;
}

export function getOwned(id) {
    return state.owned[id] || 0;
}

export function isUpgradeAvailable(upgrade) {
    if (!(state.stage > upgrade.stage)) return false;
    if (upgrade.nb_max != null && getOwned(upgrade.id) >= upgrade.nb_max) {
        return false;
    }
    return true;
}

export function costOf(upgrade) {
    const owned = getOwned(upgrade.id);
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costGrowth, owned));
}

export function isToolUnlocked(toolId) {
    return Boolean(state.tools[toolId]);
}

export function isBoutureTypeUnlocked(typeId) {
    return Boolean(state.boutureTypes[typeId]);
}

export function cooldownLeft(key) {
    return Math.max(0, (state.toolReadyAt[key] || 0) - Date.now());
}

export function findTree(treeId) {
    return state.trees.find((t) => t.id === treeId);
}

/** Total number of cuttings (any type) posed on a given tree. */
export function treeCuttingsTotal(tree) {
    return Object.values(tree.cuttings).reduce((sum, n) => sum + n, 0);
}

/** Extra global CPS multiplier contributed by a tree, from its own cutting count. */
function treeMultiplierContribution(tree) {
    return treeCuttingsTotal(tree) * TREE_MULTIPLIER_PER_CUTTING;
}

/** 1 + sum of every tree's multiplier contribution — the more cuttings piled on a tree, the bigger the bonus. */
export function globalTreeMultiplier() {
    return 1 + state.trees.reduce((sum, tree) => sum + treeMultiplierContribution(tree), 0);
}

export function basePerClick() {
    let value = 1;
    for (const u of UPGRADES) {
        if (u.clickBonus) {
            value += u.clickBonus * getOwned(u.id);
        }
    }
    return value;
}

/** CPS from purchased varieties + all posed cuttings, before the tree multiplier and buffs. */
export function basePerSecond() {
    let value = 0;
    for (const u of UPGRADES) {
        if (u.cps) {
            value += u.cps * getOwned(u.id);
        }
    }
    for (const tree of state.trees) {
        for (const [typeId, count] of Object.entries(tree.cuttings)) {
            const type = BOUTURE_BY_ID.get(typeId);
            if (type) value += count * type.cpsPerCutting;
        }
    }
    return value;
}

export function waterActive() {
    return Date.now() < state.waterUntil;
}

export function fertilizerActive() {
    return Date.now() < state.fertilizerUntil;
}

export function perClick() {
    let value = basePerClick();
    if (waterActive()) value *= 2;
    return value;
}

export function perSecond() {
    let value = basePerSecond() * globalTreeMultiplier();
    if (fertilizerActive()) value *= 2;
    return value;
}

export function save() {
    const payload = {
        apples: state.apples,
        stage: state.stage,
        owned: state.owned,
        trees: state.trees,
        tools: state.tools,
        boutureTypes: state.boutureTypes,
        toolReadyAt: state.toolReadyAt,
        waterUntil: state.waterUntil,
        fertilizerUntil: state.fertilizerUntil,
        savedAt: Date.now(),
    };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (_) {
        /* storage unavailable (private mode / quota) — ignore */
    }
}

export function load() {
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
        if (Array.isArray(data.trees) && data.trees.length > 0) {
            state.trees = data.trees
                .filter((t) => t && typeof t.id === "string")
                .map((t) => ({
                    id: t.id,
                    cuttings: t.cuttings && typeof t.cuttings === "object" ? { ...t.cuttings } : {},
                }));
        }
        if (data.tools && typeof data.tools === "object") {
            for (const id of Object.keys(state.tools)) {
                state.tools[id] = Boolean(data.tools[id]);
            }
        }
        if (data.boutureTypes && typeof data.boutureTypes === "object") {
            for (const id of Object.keys(state.boutureTypes)) {
                state.boutureTypes[id] = Boolean(data.boutureTypes[id]);
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
        // Sync unlocks from owned shop items, in case onBuy was missed.
        if (getOwned("outil_arrosoir") > 0) state.tools.arroser = true;
        if (getOwned("outil_engrais") > 0) state.tools.engrais = true;
        for (const t of BOUTURE_TYPES) {
            if (getOwned(`bouture_${t.id}`) > 0) state.boutureTypes[t.id] = true;
        }

        if (typeof data.savedAt === "number") {
            const elapsedSec = Math.max(0, (Date.now() - data.savedAt) / 1000);
            const offlineGain = Math.min(elapsedSec, 8 * 3600) * perSecond();
            state.apples += offlineGain;
        }
    } catch (_) {
        /* corrupt save — start fresh rather than crash */
    }
}
