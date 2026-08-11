"use strict";

/**
 * DOM references and rendering. Nothing here mutates game rules — it only
 * reads `state` and reflects it on screen. Buy/use-tool/pose-bouture clicks
 * are wired through callbacks passed in by game.js, so this module doesn't
 * need to know how purchases or bouture placement work.
 */

import { TOOLS, UPGRADES, BOUTURE_TYPES } from "./config.js";
import {
    state,
    getOwned,
    costOf,
    currencyOf,
    resourceAmount,
    isUpgradeAvailable,
    isToolUnlocked,
    isBoutureTypeUnlocked,
    cooldownLeft,
    waterActive,
    fertilizerActive,
    treeCuttingsTotal,
    perClick,
    perSecond,
    attraitUnlocked,
    attraitPerSecond,
} from "./state.js";
import { formatNumber } from "./utils.js";

const CURRENCY_ICON = { apples: "🍎", attrait: "✨" };

export const els = {
    apples: document.getElementById("apples"),
    perClick: document.getElementById("per-click"),
    perSecond: document.getElementById("per-second"),
    cuttings: document.getElementById("cuttings"),
    attraitStat: document.getElementById("attrait-stat"),
    attrait: document.getElementById("attrait"),
    attraitPerSecondStat: document.getElementById("attrait-per-second-stat"),
    attraitPerSecond: document.getElementById("attrait-per-second"),
    treeZone: document.getElementById("tree-zone"),
    boutureHint: document.getElementById("bouture-hint"),
    shopList: document.getElementById("shop-list"),
    shopTabApples: document.getElementById("shop-tab-apples"),
    shopTabAttrait: document.getElementById("shop-tab-attrait"),
    attraitShopList: document.getElementById("attrait-shop-list"),
    toolsList: document.getElementById("tools-list"),
    toolsPanel: document.getElementById("tools-panel"),
    buffBar: document.getElementById("buff-bar"),
    floating: document.getElementById("floating-layer"),
    resetBtn: document.getElementById("reset-btn"),
    gameRoot: document.querySelector(".game"),
};

let activeShopTab = "apples";

function setShopTab(tab) {
    activeShopTab = tab;
    els.shopList.hidden = tab !== "apples";
    els.attraitShopList.hidden = tab !== "attrait";
    els.shopTabApples.classList.toggle("is-active", tab === "apples");
    els.shopTabApples.setAttribute("aria-selected", String(tab === "apples"));
    els.shopTabAttrait.classList.toggle("is-active", tab === "attrait");
    els.shopTabAttrait.setAttribute("aria-selected", String(tab === "attrait"));
}

els.shopTabApples.addEventListener("click", () => setShopTab("apples"));
els.shopTabAttrait.addEventListener("click", () => setShopTab("attrait"));

export function spawnFloat(amount, clientX, clientY) {
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

export function renderStats() {
    els.apples.textContent = formatNumber(state.apples);
    els.perClick.textContent = formatNumber(perClick());
    els.perSecond.textContent = formatNumber(perSecond());
    els.cuttings.textContent = String(treeCuttingsTotal());

    const attrait = attraitUnlocked();
    els.attraitStat.hidden = !attrait;
    els.attraitPerSecondStat.hidden = !attrait;
    if (attrait) {
        els.attrait.textContent = formatNumber(state.attrait);
        els.attraitPerSecond.textContent = formatNumber(attraitPerSecond());
    }

    renderBuffs();
}

/** Shows/hides the "click a tree" hint while a bouture is armed for placement. */
export function renderBoutureTargeting(armedType) {
    els.treeZone.classList.toggle("is-targeting", Boolean(armedType));
    if (!els.boutureHint) return;
    if (armedType) {
        els.boutureHint.hidden = false;
        els.boutureHint.textContent =
            `Cliquez sur le pommier pour poser une ${armedType.name} (${armedType.applyCost} 🍎)`;
    } else {
        els.boutureHint.hidden = true;
        els.boutureHint.textContent = "";
    }
}

function toolRowState(tool) {
    if (tool.appleCost && state.apples < tool.appleCost) {
        return { disabled: true, label: `Pas assez (${tool.appleCost} 🍎)`, meta: "Prêt" };
    }
    const left = cooldownLeft(tool.id);
    if (left > 0) {
        return { disabled: true, label: `Cooldown ${Math.ceil(left / 1000)}s`, meta: "En recharge…" };
    }
    const label = tool.appleCost ? `${tool.actionLabel} — ${tool.appleCost} 🍎` : tool.actionLabel;
    return { disabled: false, label, meta: `Cooldown : ${tool.cooldownSec}s` };
}

function boutureRowState(type, armed) {
    const left = cooldownLeft(`bouture_${type.id}`);
    if (armed) {
        return { disabled: false, label: "Annuler", meta: "Cliquez sur le pommier…" };
    }
    if (state.apples < type.applyCost) {
        return { disabled: true, label: `Pas assez (${type.applyCost} 🍎)`, meta: "Prêt" };
    }
    if (left > 0) {
        return { disabled: true, label: `Cooldown ${Math.ceil(left / 1000)}s`, meta: "En recharge…" };
    }
    return { disabled: false, label: `Poser — ${type.applyCost} 🍎`, meta: `Cooldown : ${type.cooldownSec}s` };
}

function refreshToolRows(armedTypeId) {
    for (const tool of TOOLS) {
        const row = els.toolsList.querySelector(`[data-tool="${tool.id}"]`);
        if (!row) continue;
        const { disabled, label, meta } = toolRowState(tool);
        row.querySelector(".tool-btn").disabled = disabled;
        row.querySelector(".tool-btn").textContent = label;
        row.querySelector(".tool-meta").textContent = meta;
    }
    for (const type of BOUTURE_TYPES) {
        const row = els.toolsList.querySelector(`[data-bouture="${type.id}"]`);
        if (!row) continue;
        const armed = armedTypeId === type.id;
        const { disabled, label, meta } = boutureRowState(type, armed);
        row.classList.toggle("is-armed", armed);
        row.querySelector(".tool-btn").disabled = disabled;
        row.querySelector(".tool-btn").textContent = label;
        row.querySelector(".tool-meta").textContent = meta;
    }
}

/**
 * @param {(toolId: string) => void} onUseTool
 * @param {(typeId: string) => void} onArmBouture
 * @param {string|null} armedTypeId
 */
export function buildTools(onUseTool, onArmBouture, armedTypeId) {
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
        li.querySelector(".tool-btn").addEventListener("click", () => onUseTool(tool.id));
        els.toolsList.appendChild(li);
    }

    for (const type of BOUTURE_TYPES) {
        if (!isBoutureTypeUnlocked(type.id)) continue;
        const li = document.createElement("li");
        li.className = "tool-item";
        li.dataset.bouture = type.id;
        li.innerHTML = `
            <span class="tool-item-name">${type.name}</span>
            <p class="tool-item-desc">${type.desc}</p>
            <span class="tool-meta"></span>
            <button type="button" class="tool-btn"></button>
        `;
        li.querySelector(".tool-btn").addEventListener("click", () => onArmBouture(type.id));
        els.toolsList.appendChild(li);
    }

    const anyUnlocked =
        TOOLS.some((t) => isToolUnlocked(t.id)) || BOUTURE_TYPES.some((t) => isBoutureTypeUnlocked(t.id));
    els.toolsPanel.hidden = !anyUnlocked;
    els.gameRoot.classList.toggle("has-tools", anyUnlocked);

    refreshToolRows(armedTypeId);
}

/**
 * @param {(toolId: string) => void} onUseTool
 * @param {(typeId: string) => void} onArmBouture
 * @param {string|null} armedTypeId
 */
export function renderTools(onUseTool, onArmBouture, armedTypeId) {
    const visibleIds = new Set([
        ...TOOLS.filter((t) => isToolUnlocked(t.id)).map((t) => `tool:${t.id}`),
        ...BOUTURE_TYPES.filter((t) => isBoutureTypeUnlocked(t.id)).map((t) => `bouture:${t.id}`),
    ]);
    const existingIds = new Set([
        ...[...els.toolsList.querySelectorAll("[data-tool]")].map((el) => `tool:${el.dataset.tool}`),
        ...[...els.toolsList.querySelectorAll("[data-bouture]")].map((el) => `bouture:${el.dataset.bouture}`),
    ]);
    const same =
        visibleIds.size === existingIds.size && [...visibleIds].every((id) => existingIds.has(id));
    if (!same) {
        buildTools(onUseTool, onArmBouture, armedTypeId);
        return;
    }

    const anyUnlocked = visibleIds.size > 0;
    els.toolsPanel.hidden = !anyUnlocked;
    els.gameRoot.classList.toggle("has-tools", anyUnlocked);
    refreshToolRows(armedTypeId);
}

/** Upgrades for one currency, in catalog order. */
function upgradesFor(currency) {
    return UPGRADES.filter((u) => currencyOf(u) === currency);
}

function renderShopSection(currency, listEl) {
    const availableIds = new Set(upgradesFor(currency).filter(isUpgradeAvailable).map((u) => u.id));
    const existing = new Set([...listEl.querySelectorAll("[data-id]")].map((el) => el.dataset.id));

    const same =
        availableIds.size === existing.size &&
        [...availableIds].every((id) => existing.has(id));
    if (!same) return false;

    for (const u of upgradesFor(currency)) {
        if (!availableIds.has(u.id)) continue;
        const row = listEl.querySelector(`[data-id="${u.id}"]`);
        if (!row) continue;
        const owned = getOwned(u.id);
        const cost = costOf(u);
        const maxLabel = u.nb_max != null ? ` / ${u.nb_max}` : "";
        row.querySelector(".owned-count").textContent = String(owned) + maxLabel;
        row.querySelector(".price").textContent = formatNumber(cost);
        row.querySelector(".buy-btn").disabled = resourceAmount(currency) < cost;
    }
    return true;
}

/** @param {(upgradeId: string) => void} onBuy */
function buildShopSection(onBuy, currency, listEl) {
    const icon = CURRENCY_ICON[currency];
    listEl.innerHTML = "";
    for (const u of upgradesFor(currency)) {
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
                Acheter — <span class="price">0</span> ${icon}
            </button>
        `;
        li.querySelector(".buy-btn").addEventListener("click", () => onBuy(u.id));
        listEl.appendChild(li);

        const owned = getOwned(u.id);
        const cost = costOf(u);
        li.querySelector(".owned-count").textContent = String(owned) + maxLabel;
        li.querySelector(".price").textContent = formatNumber(cost);
        li.querySelector(".buy-btn").disabled = resourceAmount(currency) < cost;
    }
}

function refreshAttraitTab() {
    const unlocked = attraitUnlocked();
    els.shopTabAttrait.hidden = !unlocked;
    if (!unlocked && activeShopTab === "attrait") setShopTab("apples");
}

/** @param {(upgradeId: string) => void} onBuy */
export function renderShop(onBuy) {
    if (!renderShopSection("apples", els.shopList)) buildShopSection(onBuy, "apples", els.shopList);
    if (!renderShopSection("attrait", els.attraitShopList)) {
        buildShopSection(onBuy, "attrait", els.attraitShopList);
    }
    refreshAttraitTab();
}

/** @param {(upgradeId: string) => void} onBuy */
export function buildShop(onBuy) {
    buildShopSection(onBuy, "apples", els.shopList);
    buildShopSection(onBuy, "attrait", els.attraitShopList);
    refreshAttraitTab();
}

/** Renders the (single) tree button into the orchard; no-op if it already exists. */
export function renderTree() {
    if (document.getElementById("tree-btn")) return;

    const template = document.getElementById("tree-template");
    const button = document.createElement("button");
    button.type = "button";
    button.id = "tree-btn";
    button.className = "tree-btn";
    button.setAttribute("aria-label", "Cueillir une pomme");
    button.appendChild(template.content.cloneNode(true));

    els.treeZone.appendChild(button);
}

/** Reflects the tree's cutting count as a small badge on its button. */
export function updateTreeBadges() {
    const btn = document.getElementById("tree-btn");
    if (!btn) return;
    const total = treeCuttingsTotal();
    let badge = btn.querySelector(".tree-badge");
    if (total <= 0) {
        if (badge) badge.remove();
        return;
    }
    if (!badge) {
        badge = document.createElement("span");
        badge.className = "tree-badge";
        btn.appendChild(badge);
    }
    badge.textContent = `🌱 ${total}`;
}

export function renderVerger() {
    renderTree();
    updateTreeBadges();
}
