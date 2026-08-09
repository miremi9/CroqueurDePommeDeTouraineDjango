"use strict";

/**
 * Static game data: tunable constants, upgrade catalog, tool catalog,
 * bouture (cutting) catalog. No game state or DOM access here — this
 * module is pure data.
 */

/** Bump the suffix whenever the save shape changes, to invalidate old saves. */
export const STORAGE_KEY = "verger-infini-save-v4";
export const TICK_MS = 100;

/** Extra global CPS multiplier granted per cutting present on a given tree, summed across trees. */
export const TREE_MULTIPLIER_PER_CUTTING = 0.05;

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
 * @property {string|null} [onBuy] key into EFFECTS, see effects.js
 * @property {string} [boutureType] for onBuy "unlockBoutureType": id into BOUTURE_TYPES
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

/**
 * @typedef {object} BoutureTypeDef
 * @property {string} id
 * @property {string} name
 * @property {string} desc
 * @property {number} cpsPerCutting apples/s added (globally) per cutting of this type placed on any tree
 * @property {number} applyCost apples paid each time this type is posed on a tree
 * @property {number} cooldownSec cooldown before this type can be posed again
 */

/** Instant-use tools, unlocked via UPGRADES[].onBuy "unlockArroser" / "unlockEngrais". */
/** @type {ToolDef[]} */
export const TOOLS = [
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

/**
 * Bouture types. Each is unlocked once via the shop (see UPGRADES with
 * onBuy "unlockBoutureType"), then posed on a chosen tree from the Bouture
 * tool for `applyCost` apples. Posed cuttings add flat CPS and also feed
 * that tree's multiplier bonus (see state.js globalTreeMultiplier).
 * @type {BoutureTypeDef[]}
 */
export const BOUTURE_TYPES = [
    {
        id: "golden",
        name: "Bouture Golden",
        desc: "+0.25 pomme/s par bouture posée",
        cpsPerCutting: 0.25,
        applyCost: 40,
        cooldownSec: 15,
    },
    {
        id: "granny",
        name: "Bouture Granny",
        desc: "+1 pomme/s par bouture posée",
        cpsPerCutting: 1,
        applyCost: 150,
        cooldownSec: 20,
    },
    {
        id: "gala",
        name: "Bouture Gala",
        desc: "+4 pommes/s par bouture posée",
        cpsPerCutting: 4,
        applyCost: 600,
        cooldownSec: 25,
    },
];

/** @type {UpgradeDef[]} */
export const UPGRADES = [
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
        id: "new_pommier",
        name: "Pommier",
        desc: "Ajoute un pommier",
        baseCost: 80,
        costGrowth: 200,
        nb_max: 10,
        stage: -1,
        onBuy: "addTree",
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
        id: "bouture_golden",
        name: "Bouture Golden",
        desc: "Débloque la Bouture Golden dans l'outil Bouture (+0.25 pomme/s par bouture posée)",
        baseCost: 120,
        costGrowth: 1,
        nb_max: 1,
        stage: -1,
        onBuy: "unlockBoutureType",
        boutureType: "golden",
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
        id: "bouture_granny",
        name: "Bouture Granny",
        desc: "Débloque la Bouture Granny dans l'outil Bouture (+1 pomme/s par bouture posée)",
        baseCost: 600,
        costGrowth: 1,
        nb_max: 1,
        stage: 0,
        onBuy: "unlockBoutureType",
        boutureType: "granny",
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
        id: "bouture_gala",
        name: "Bouture Gala",
        desc: "Débloque la Bouture Gala dans l'outil Bouture (+4 pommes/s par bouture posée)",
        baseCost: 4000,
        costGrowth: 1,
        nb_max: 1,
        stage: 1,
        onBuy: "unlockBoutureType",
        boutureType: "gala",
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
