/**
 * Global Configuration & Feature Flags
 * سِدرة
 */

export const CONFIG = {
    // SECURITY & LEDGER
    LEDGER_V2_ENABLED: true,
    TOKENS_STRICT: true,
    MAX_MINT_PER_HOUR: 10000,

    // FEATURE FLAGS
    METAVERSE_REALDATA_ENABLED: true,
    SENTINEL_AUTO_FLAG: true,

    // UI SETTINGS
    THEME: 'cyber-chill',
    RTL: true,
};

export type FeatureFlag = keyof typeof CONFIG;
