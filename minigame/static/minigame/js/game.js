"use strict";

/**
 * Entry point: wires user actions (buy / use tool / arm+pose bouture / pick
 * apple / reset) to state + rendering, and drives the game loop. Game data
 * lives in config.js, mutable state in state.js, purchase side effects in
 * effects.js, DOM in ui.js.
 */

import { UPGRADES, TOOLS, BOUTURE_TYPES, TICK_MS, STORAGE_KEY } from "./config.js";
import {
    state,
    getOwned,
    isUpgradeAvailable,
    costOf,
    isToolUnlocked,
    isBoutureTypeUnlocked,
    cooldownLeft,
    findTree,
    perClick,
    perSecond,
    save,
    load,
} from "./state.js";
import { callUpgradeEffect } from "./effects.js";
import {
    els,
    spawnFloat,
    renderStats,
    renderShop,
    buildShop,
    renderTools,
    buildTools,
    renderVerger,
    renderBoutureTargeting,
    updateTreeBadges,
} from "./ui.js";

// Bouture type currently "armed": the next click on a tree poses it there.
// Not persisted — placement is a single in-session action.
let armedBouture = null;

function refreshTools() {
    renderTools(useTool, armBouture, armedBouture && armedBouture.id);
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
    renderShop(buy);
    refreshTools();
}

function useTool(toolId) {
    const tool = TOOLS.find((t) => t.id === toolId);
    if (!tool || !isToolUnlocked(toolId)) return;
    if (cooldownLeft(toolId) > 0) return;

    if (toolId === "arroser") {
        state.waterUntil = Date.now() + 12_000;
        state.toolReadyAt.arroser = Date.now() + tool.cooldownSec * 1000;
    } else if (toolId === "engrais") {
        state.fertilizerUntil = Date.now() + 20_000;
        state.toolReadyAt.engrais = Date.now() + tool.cooldownSec * 1000;
    }

    save();
    renderStats();
    refreshTools();
    renderShop(buy);
}

/** Arms a bouture type for placement, or cancels it if the same type is clicked again. */
function armBouture(typeId) {
    if (!isBoutureTypeUnlocked(typeId)) return;
    armedBouture = armedBouture && armedBouture.id === typeId
        ? null
        : BOUTURE_TYPES.find((t) => t.id === typeId) || null;

    refreshTools();
    renderBoutureTargeting(armedBouture);
}

/** Spends apples to pose the armed bouture type on the given tree. */
function poseBouture(treeId) {
    const type = armedBouture;
    if (!type) return;
    if (cooldownLeft(`bouture_${type.id}`) > 0) return;
    if (state.apples < type.applyCost) return;

    const tree = findTree(treeId);
    if (!tree) return;

    state.apples -= type.applyCost;
    tree.cuttings[type.id] = (tree.cuttings[type.id] || 0) + 1;
    state.toolReadyAt[`bouture_${type.id}`] = Date.now() + type.cooldownSec * 1000;

    armedBouture = null;
    renderBoutureTargeting(null);

    save();
    renderStats();
    renderShop(buy);
    refreshTools();
    updateTreeBadges();
}

// Tree buttons are added/removed dynamically, so clicks are handled via
// delegation on the container rather than one listener per button.
function pickApple(event) {
    const btn = event.target.closest(".tree-btn");
    if (!btn) return;

    if (armedBouture) {
        poseBouture(btn.dataset.treeId);
        return;
    }

    const gain = perClick();
    state.apples += gain;
    btn.classList.add("is-pressed");
    window.setTimeout(() => btn.classList.remove("is-pressed"), 80);

    const rect = btn.getBoundingClientRect();
    const x = event.clientX || rect.left + rect.width / 2;
    const y = event.clientY || rect.top + rect.height / 2;
    spawnFloat(gain, x, y);

    save();
    renderStats();
    renderShop(buy);
    refreshTools();
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
    renderShop(buy);
    refreshTools();
}

function reset() {
    if (!window.confirm("Réinitialiser tout le verger ?")) return;
    state.apples = 0;
    state.stage = 0;
    state.trees = [{ id: "base", cuttings: {} }];
    state.waterUntil = 0;
    state.fertilizerUntil = 0;
    for (const u of UPGRADES) {
        state.owned[u.id] = 0;
    }
    for (const id of Object.keys(state.tools)) {
        state.tools[id] = false;
    }
    for (const id of Object.keys(state.boutureTypes)) {
        state.boutureTypes[id] = false;
    }
    for (const id of Object.keys(state.toolReadyAt)) {
        state.toolReadyAt[id] = 0;
    }
    armedBouture = null;
    renderBoutureTargeting(null);
    els.treeZone.innerHTML = "";
    localStorage.removeItem(STORAGE_KEY);
    renderStats();
    buildShop(buy);
    refreshTools();
    renderVerger();
}

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && armedBouture) {
        armedBouture = null;
        renderBoutureTargeting(null);
        refreshTools();
    }
});

load();
buildTools(useTool, armBouture, null);
buildShop(buy);
renderStats();
renderShop(buy);
refreshTools();
renderVerger();

els.treeZone.addEventListener("click", pickApple);
els.resetBtn.addEventListener("click", reset);

window.setInterval(tick, TICK_MS);
window.setInterval(save, 5000);
window.addEventListener("beforeunload", save);
