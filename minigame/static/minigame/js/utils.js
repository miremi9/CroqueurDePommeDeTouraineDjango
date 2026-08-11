"use strict";

/** Formats large numbers compactly ("12.3k", "1.20M"), small ones with limited decimals. */
export function formatNumber(n) {
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
