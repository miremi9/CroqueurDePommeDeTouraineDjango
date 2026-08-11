"use strict";

/**
 * Static game data: tunable constants, upgrade catalog, tool catalog,
 * bouture (cutting) catalog. No game state or DOM access here — this
 * module is pure data.
 */

/** Bump the suffix whenever the save shape changes, to invalidate old saves. */
export const STORAGE_KEY = "verger-infini-save-v6";
export const TICK_MS = 100;

/** Attrait (people's growing interest in the orchard) unlocks once state.stage reaches this value. */
export const ATTRAIT_UNLOCK_STAGE = 1;
/** Ambient attrait/s once unlocked, before any attraitCps upgrade. */
export const ATTRAIT_BASE_PER_SECOND = 0.05;
/** perSecond() production multiplier contributed by attrait: 1 + this * state.attrait. */
export const ATTRAIT_PRODUCTION_BONUS_PER_ATTRAIT = 0.2;

/**
 * @typedef {object} UpgradeDef
 * @property {string} id
 * @property {string} name
 * @property {string} desc
 * @property {number} baseCost
 * @property {number} costGrowth
 * @property {number|null} nb_max
 * @property {number} stage
 * @property {"apples"|"attrait"} [currency] which resource this upgrade is priced in; defaults to "apples"
 * @property {number} [clickBonus]
 * @property {number} [cps]
 * @property {number} [attraitCps] flat attrait/s added by owning this upgrade
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
 * @property {number} [appleCost] apples spent each use, for tools that cost apples per use
 * @property {number} [attraitGain] flat attrait granted each use
 */

/**
 * @typedef {object} BoutureTypeDef
 * @property {string} id
 * @property {string} name
 * @property {string} desc
 * @property {"production"|"baseValue"|"click"|"buff"|"shop"} kind which multiplier stack this bouture feeds
 * @property {number} factorPerCutting multiplier contributed by ONE cutting of this type; N cuttings of
 *   the same type compound as factorPerCutting ** N (each bouture "multiplies with itself")
 * @property {number} applyCost apples paid each time this type is posed on the tree
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
    {
        id: "visite_verger",
        name: "Visite du verger",
        desc: "Coûte 150 pommes, rapporte +20 attrait",
        unlockUpgradeId: "outil_visite",
        cooldownSec: 25,
        actionLabel: "Organiser une visite",
        appleCost: 150,
        attraitGain: 20,
    },
];

/**
 * Bouture types. There is a single tree in the orchard; each type is
 * unlocked once via the shop (see UPGRADES with onBuy "unlockBoutureType"),
 * then can be posed on the tree any number of times from the Bouture tool
 * for `applyCost` apples each time. Every posed cutting of a given type
 * multiplies that type's bonus stack by `factorPerCutting` — the bonus is
 * cumulable (more cuttings = more stacks) AND compounds with itself
 * (N cuttings of the same type give factorPerCutting ** N, not a flat sum).
 * Different types feed independent multiplier stacks (see state.js
 * boutureMultiplier), so they combine with each other too.
 * @type {BoutureTypeDef[]}
 */
export const BOUTURE_TYPES = [
    {
        id: "croissance",
        name: "Bouture de Croissance",
        desc: "×1.20 production / s par bouture posée (cumul multiplicatif)",
        kind: "production",
        factorPerCutting: 1.2,
        applyCost: 50,
        cooldownSec: 15,
    },
    {
        id: "vive",
        name: "Bouture Vive",
        desc: "×1.25 pommes par clic par bouture posée",
        kind: "click",
        factorPerCutting: 1.25,
        applyCost: 100,
        cooldownSec: 15,
    },
    {
        id: "nectar",
        name: "Bouture de Nectar",
        desc: "×1.15 valeur de la pomme de base par bouture posée (booste clic ET production)",
        kind: "baseValue",
        factorPerCutting: 1.15,
        applyCost: 200,
        cooldownSec: 20,
    },
    {
        id: "catalyseuse",
        name: "Bouture Catalyseuse",
        desc: "×1.30 puissance des bonus temporaires (Arroser / Engrais) par bouture posée",
        kind: "buff",
        factorPerCutting: 1.3,
        applyCost: 500,
        cooldownSec: 30,
    },
    {
        id: "marchande",
        name: "Bouture Marchande",
        desc: "-5 % sur les prix de la boutique par bouture posée (cumul multiplicatif)",
        kind: "shop",
        factorPerCutting: 0.95,
        applyCost: 800,
        cooldownSec: 30,
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
        id: "bouture_croissance",
        name: "Bouture de Croissance",
        desc: "Débloque la Bouture de Croissance dans l'outil Bouture (×1.20 production/s par bouture posée)",
        baseCost: 150,
        costGrowth: 1,
        nb_max: 1,
        stage: -1,
        onBuy: "unlockBoutureType",
        boutureType: "croissance",
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
        id: "bouture_vive",
        name: "Bouture Vive",
        desc: "Débloque la Bouture Vive dans l'outil Bouture (×1.25 pommes par clic par bouture posée)",
        baseCost: 500,
        costGrowth: 1,
        nb_max: 1,
        stage: 0,
        onBuy: "unlockBoutureType",
        boutureType: "vive",
    },
    {
        id: "bouture_nectar",
        name: "Bouture de Nectar",
        desc: "Débloque la Bouture de Nectar dans l'outil Bouture (×1.15 valeur de la pomme de base par bouture posée)",
        baseCost: 900,
        costGrowth: 1,
        nb_max: 1,
        stage: 0,
        onBuy: "unlockBoutureType",
        boutureType: "nectar",
    },
    {
        id: "affiches",
        name: "Affiches publicitaires",
        desc: "+0.15 attrait / s — fait connaître le verger",
        baseCost: 250,
        costGrowth: 1.35,
        nb_max: null,
        stage: 0,
        attraitCps: 0.15,
        onBuy: null,
    },
    {
        id: "outil_visite",
        name: "Carnet de visites",
        desc: "Débloque l'outil Visite du verger (onglet Outils)",
        baseCost: 400,
        costGrowth: 1,
        nb_max: 1,
        stage: 0,
        onBuy: "unlockVisite",
    },
    {
        id: "vitrine",
        name: "Vitrine soignée",
        desc: "+3 pommes par cueillette — payé en Attrait",
        baseCost: 5,
        costGrowth: 1.5,
        nb_max: null,
        stage: 0,
        currency: "attrait",
        clickBonus: 3,
        onBuy: null,
    },
    {
        id: "renommee",
        name: "Bonne réputation",
        desc: "+12 pommes / s — payé en Attrait",
        baseCost: 8,
        costGrowth: 1.5,
        nb_max: null,
        stage: 0,
        currency: "attrait",
        cps: 12,
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
        id: "campagne_pub",
        name: "Campagne publicitaire",
        desc: "+0.6 attrait / s",
        baseCost: 6000,
        costGrowth: 1.4,
        nb_max: null,
        stage: 1,
        attraitCps: 0.6,
        onBuy: null,
    },
    {
        id: "ambassadeurs",
        name: "Ambassadeurs du verger",
        desc: "+1.2 attrait / s — payé en Attrait (l'intérêt attire l'intérêt)",
        baseCost: 30,
        costGrowth: 1.6,
        nb_max: null,
        stage: 1,
        currency: "attrait",
        attraitCps: 1.2,
        onBuy: null,
    },
    {
        id: "mecenat",
        name: "Mécénat",
        desc: "+40 pommes / s — payé en Attrait",
        baseCost: 45,
        costGrowth: 1.6,
        nb_max: null,
        stage: 1,
        currency: "attrait",
        cps: 40,
        onBuy: null,
    },
    {
        id: "bouture_catalyseuse",
        name: "Bouture Catalyseuse",
        desc: "Débloque la Bouture Catalyseuse dans l'outil Bouture (×1.30 puissance des bonus temporaires par bouture posée)",
        baseCost: 3000,
        costGrowth: 1,
        nb_max: 1,
        stage: 1,
        onBuy: "unlockBoutureType",
        boutureType: "catalyseuse",
    },
    {
        id: "bouture_marchande",
        name: "Bouture Marchande",
        desc: "Débloque la Bouture Marchande dans l'outil Bouture (-5 % sur les prix de la boutique par bouture posée)",
        baseCost: 6000,
        costGrowth: 1,
        nb_max: 1,
        stage: 1,
        onBuy: "unlockBoutureType",
        boutureType: "marchande",
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
