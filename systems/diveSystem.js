// systems/diveSystem.js

const DEPTH_LEVELS = ['surface', 'periscope', 'deep', 'veryDeep'];

const DEPTH_RULES = {
    surface:   { speedMult: 1.00, spotMult: 1.0, spotMax: null, oxygenRegen: 2 },
    periscope: { speedMult: 0.75, spotMult: 0.5, spotMax: null, oxygenRegen: 0 },
    deep:      { speedMult: 0.50, spotMult: null, spotMax: 3,   oxygenRegen: 0 },
    veryDeep:  { speedMult: 0.10, spotMult: null, spotMax: 0,   oxygenRegen: 0 },
};

// depth → weaponType → whether that weapon can hit a sub at that depth
const TARGETING_MATRIX = {
    surface:   { gun: true,  torpedo: true,  bomb: true,  shipDepthCharge: false, planeDepthCharge: false },
    periscope: { gun: false, torpedo: true,  bomb: true,  shipDepthCharge: true,  planeDepthCharge: true  },
    deep:      { gun: false, torpedo: false, bomb: false, shipDepthCharge: true,  planeDepthCharge: true  },
    veryDeep:  { gun: false, torpedo: false, bomb: false, shipDepthCharge: true,  planeDepthCharge: true  },
};

function isSubmarine(ship) {
    return ship?.type === 'submarine' || !!ship?.shipClass?.toLowerCase().includes('submarine');
}

// Dive to targetDepth. Costs 1 AP. Can jump multiple levels at once. Only descends.
function dive(submarine, targetDepth) {
    if (!isSubmarine(submarine)) return { success: false, message: 'Only submarines can dive.' };
    if (!DEPTH_LEVELS.includes(targetDepth) || targetDepth === 'surface') {
        return { success: false, message: 'Invalid depth. Choose: periscope, deep, or veryDeep.' };
    }
    const currentIndex = DEPTH_LEVELS.indexOf(submarine.depth || 'surface');
    const targetIndex  = DEPTH_LEVELS.indexOf(targetDepth);
    if (targetIndex <= currentIndex) {
        return { success: false, message: `Already at or deeper than ${formatDepth(targetDepth)}. Use /surface to ascend first.` };
    }
    if ((submarine.oxygen ?? 0) <= 0) {
        return { success: false, message: 'No air remaining — surface to replenish oxygen before diving.' };
    }
    submarine.depth = targetDepth;
    return { success: true, message: `Diving to **${formatDepth(targetDepth)}** depth.`, apCost: 1 };
}

// Surface immediately. Free action. Always goes to Surface (no partial ascent).
function surface(submarine) {
    if (!isSubmarine(submarine)) return { success: false, message: 'Only submarines can surface.' };
    if ((submarine.depth || 'surface') === 'surface') return { success: false, message: 'Already at surface.' };
    const prev = submarine.depth;
    submarine.depth = 'surface';
    return { success: true, message: `Surfacing from **${formatDepth(prev)}** depth.` };
}

// Called at start of each submarine's turn. Ticks oxygen. Forces surface if depleted.
function processDiveTick(submarine) {
    if (!isSubmarine(submarine)) return { forcedSurface: false, oxygenRemaining: null };
    const depth = submarine.depth || 'surface';
    const rule = DEPTH_RULES[depth];

    if (depth === 'surface') {
        submarine.oxygen = Math.min(
            submarine.maxOxygen ?? 10,
            (submarine.oxygen ?? submarine.maxOxygen ?? 10) + rule.oxygenRegen
        );
        return { forcedSurface: false, oxygenRemaining: submarine.oxygen };
    }

    // Drain rate: 1 per turn when submerged (uniform across all submerged depths)
    submarine.oxygen = Math.max(0, (submarine.oxygen ?? submarine.maxOxygen ?? 10) - 1);
    if (submarine.oxygen <= 0) {
        submarine.depth = 'surface';
        return { forcedSurface: true, oxygenRemaining: 0 };
    }
    return { forcedSurface: false, oxygenRemaining: submarine.oxygen };
}

// Effective movement speed at current depth.
function getEffectiveSpeed(submarine) {
    const mult = DEPTH_RULES[submarine.depth || 'surface']?.speedMult ?? 1.0;
    return Math.max(1, Math.floor((submarine.stats?.speed ?? 3) * mult));
}

// Effective spotting range for a submarine acting as spotter.
function getEffectiveSpotRange(submarine, baseRange) {
    const rule = DEPTH_RULES[submarine.depth || 'surface'];
    if (!rule) return baseRange;
    if (rule.spotMax === 0) return 0;
    if (rule.spotMax !== null) return Math.min(baseRange, rule.spotMax);
    if (rule.spotMult !== null) return Math.floor(baseRange * rule.spotMult);
    return baseRange;
}

// Multiplier applied to enemy spotting range when trying to see this submarine.
function getEnemySpotMultiplier(submarine) {
    if (!isSubmarine(submarine)) return 1.0;
    if ((submarine.depth || 'surface') === 'periscope') return 0.5;
    return 1.0; // deep/veryDeep handled by canSpot
}

// Whether spotter can detect submarine at all (ignoring range — range handled separately).
function canSpot(spotter, submarine) {
    if (!isSubmarine(submarine)) return true;
    const depth = submarine.depth || 'surface';
    if (depth === 'surface' || depth === 'periscope') return true;
    return !!spotter.hasSonar;
}

// Whether attacker can use weaponType against submarine at its current depth.
// weaponType: 'gun' | 'torpedo' | 'bomb' | 'shipDepthCharge' | 'planeDepthCharge'
function canTarget(attacker, submarine, weaponType) {
    if (!isSubmarine(submarine)) return { canTarget: true, reason: '' };
    const depth   = submarine.depth || 'surface';
    const allowed = TARGETING_MATRIX[depth]?.[weaponType] ?? false;
    if (!allowed) {
        return {
            canTarget: false,
            reason: `Cannot target a **${formatDepth(depth)}** submarine with ${weaponType}.`,
        };
    }
    return { canTarget: true, reason: '' };
}

// Set depth/oxygen fields on submarine at battle start. No-op for non-subs.
function initSubmarine(ship) {
    if (!isSubmarine(ship)) return;
    if (ship.depth     === undefined) ship.depth     = 'surface';
    if (ship.maxOxygen === undefined) ship.maxOxygen = ship.definedMaxOxygen ?? 10;
    if (ship.oxygen    === undefined) ship.oxygen    = ship.maxOxygen;
}

// Depth context string for turn-start messages.
function getDepthContextMessage(submarine) {
    const depth = submarine.depth || 'surface';
    const o = submarine.oxygen ?? '?', mo = submarine.maxOxygen ?? '?';
    return {
        surface:   `🌊 **Surface** | All weapons. Full speed. O₂: ${o}/${mo} (+2 this turn).`,
        periscope: `🔭 **Periscope** | Torpedoes & bombs allowed. Enemy spot range ×0.5. Speed −25%. O₂: ${o}/${mo}.`,
        deep:      `🌑 **Deep** | Depth charges only can reach you. Torpedoes −20% acc. Speed −50%. O₂: ${o}/${mo}.`,
        veryDeep:  `⬛ **Very Deep** | Immune. Cannot fire. Speed −90%. O₂: ${o}/${mo}.`,
    }[depth] ?? '';
}

function formatDepth(depth) {
    return { surface: 'Surface', periscope: 'Periscope', deep: 'Deep', veryDeep: 'Very Deep' }[depth] ?? depth;
}

module.exports = {
    dive, surface, processDiveTick,
    getEffectiveSpeed, getEffectiveSpotRange, getEnemySpotMultiplier,
    canSpot, canTarget,
    initSubmarine, getDepthContextMessage, formatDepth, isSubmarine,
    DEPTH_LEVELS, DEPTH_RULES, TARGETING_MATRIX,
};
