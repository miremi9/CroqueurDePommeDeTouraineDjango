"use strict";

/**
 * Mutable game state, persistence (save/load) and the pure calculations
 * derived from it (costs, production rates, availability...).
 */

import {
    STORAGE_KEY,
    UPGRADES,
    BOUTURE_TYPES,
    ATTRAIT_UNLOCK_STAGE,
    ATTRAIT_BASE_PER_SECOND,
    ATTRAIT_PRODUCTION_BONUS_PER_ATTRAIT,
} from "./config.js";

/** @typedef {{ cuttings: Record<string, number> }} Tree */

export const state = {
    apples: 0,
    /** People's interest in the orchard, unlocked once stage reaches ATTRAIT_UNLOCK_STAGE. */
    attrait: 0,
    stage: 0,
    owned: {},
    /** The single tree in the orchard, holding every posed bouture (cutting), by type id. @type {Tree} */
    tree: { cuttings: {} },
    tools: {
        arroser: false,
        engrais: false,
        visite_verger: false,
    },
    /** @type {Record<string, boolean>} unlocked bouture types, keyed by BOUTURE_TYPES id */
    boutureTypes: Object.fromEntries(BOUTURE_TYPES.map((t) => [t.id, false])),
    /** @type {Record<string, number>} timestamps (ms) at which each tool/bouture cooldown ends */
    toolReadyAt: {
        arroser: 0,
        engrais: 0,
        visite_verger: 0,
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
    const raw = upgrade.baseCost * Math.pow(upgrade.costGrowth, owned);
    return Math.max(1, Math.floor(raw * boutureMultiplier("shop")));
}

/** Which resource an upgrade is priced in: "apples" (default) or "attrait". */
export function currencyOf(upgrade) {
    return upgrade.currency === "attrait" ? "attrait" : "apples";
}

export function resourceAmount(currency) {
    return currency === "attrait" ? state.attrait : state.apples;
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

export function attraitUnlocked() {
    return state.stage >= ATTRAIT_UNLOCK_STAGE;
}

/** Attrait/s from the ambient base rate + every owned attraitCps upgrade. */
export function attraitPerSecond() {
    if (!attraitUnlocked()) return 0;
    let value = ATTRAIT_BASE_PER_SECOND;
    for (const u of UPGRADES) {
        if (u.attraitCps) value += u.attraitCps * getOwned(u.id);
    }
    return value;
}

/** perSecond() multiplier from accumulated attrait: 1 + 0.2 * attrait. */
export function attraitProductionMultiplier() {
    return 1 + ATTRAIT_PRODUCTION_BONUS_PER_ATTRAIT * state.attrait;
}

/** Total number of cuttings (any type) posed on the tree. */
export function treeCuttingsTotal() {
    return Object.values(state.tree.cuttings).reduce((sum, n) => sum + n, 0);
}

/**
 * Combined multiplier fed by every posed bouture of the given `kind`. Each
 * type compounds with itself (factorPerCutting ** count — cumulable AND
 * self-multiplying), and distinct types of the same kind stack by
 * multiplying together.
 */
export function boutureMultiplier(kind) {
    let mult = 1;
    for (const type of BOUTURE_TYPES) {
        if (type.kind !== kind) continue;
        const count = state.tree.cuttings[type.id] || 0;
        if (count > 0) mult *= Math.pow(type.factorPerCutting, count);
    }
    return mult;
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

/** CPS from purchased varieties, before bouture multipliers and buffs. */
export function basePerSecond() {
    let value = 0;
    for (const u of UPGRADES) {
        if (u.cps) {
            value += u.cps * getOwned(u.id);
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
    let value = basePerClick() * boutureMultiplier("click") * boutureMultiplier("baseValue");
    if (waterActive()) value *= 2 * boutureMultiplier("buff");
    return value;
}

export function perSecond() {
    let value =
        basePerSecond() *
        boutureMultiplier("production") *
        boutureMultiplier("baseValue") *
        attraitProductionMultiplier();
    if (fertilizerActive()) value *= 2 * boutureMultiplier("buff");
    return value;
}

export function save() {
    const payload = {
        apples: state.apples,
        attrait: state.attrait,
        stage: state.stage,
        owned: state.owned,
        tree: state.tree,
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
        if (typeof data.attrait === "number" && data.attrait >= 0) {
            state.attrait = data.attrait;
        }
        if (typeof data.stage === "number" && data.stage >= 0) {
            state.stage = Math.floor(data.stage);
        }
        if (data.tree && typeof data.tree === "object" && typeof data.tree.cuttings === "object") {
            state.tree = { cuttings: { ...data.tree.cuttings } };
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
        if (getOwned("outil_visite") > 0) state.tools.visite_verger = true;
        for (const t of BOUTURE_TYPES) {
            if (getOwned(`bouture_${t.id}`) > 0) state.boutureTypes[t.id] = true;
        }

        if (typeof data.savedAt === "number") {
            const elapsedSec = Math.min(Math.max(0, (Date.now() - data.savedAt) / 1000), 8 * 3600);
            state.apples += elapsedSec * perSecond();
            if (attraitUnlocked()) {
                state.attrait += elapsedSec * attraitPerSecond();
            }
        }
    } catch (_) {
        /* corrupt save — start fresh rather than crash */
    }
}
