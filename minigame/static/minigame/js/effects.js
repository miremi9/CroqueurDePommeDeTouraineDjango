"use strict";

/**
 * One-shot effects triggered by upgrade purchases (UPGRADES[].onBuy).
 * Kept as a lookup table so upgrade definitions in config.js stay plain data.
 */

import { state } from "./state.js";

/** @type {Record<string, (upgrade: import("./config.js").UpgradeDef) => void>} */
export const EFFECTS = {
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
    unlockVisite() {
        state.tools.visite_verger = true;
    },
    /** @param {import("./config.js").UpgradeDef} upgrade */
    unlockBoutureType(upgrade) {
        state.boutureTypes[upgrade.boutureType] = true;
    },
};

/** @param {import("./config.js").UpgradeDef} upgrade */
export function callUpgradeEffect(upgrade) {
    if (!upgrade.onBuy) return;
    const fn = EFFECTS[upgrade.onBuy];
    if (typeof fn === "function") {
        fn(upgrade);
    }
}
