// systems/diveSystem.js

const DEPTH_LEVELS = ['surface', 'periscope', 'runningDeep'];

const DEPTH_RULES = {
    surface:     { speedMult: 1.00, spotMult: 1.0,  spotMax: null, oxygenRegen: 2 },
    periscope:   { speedMult: 0.50, spotMult: 0.5,  spotMax: null, oxygenRegen: 0 },
    runningDeep: { speedMult: 0.50, spotMult: null, spotMax: 0,    oxygenRegen: 0 },
};

// depth → weaponType → whether that weapon can hit a sub at that depth
const TARGETING_MATRIX = {
    surface:     { gun: true,  torpedo: true,  bomb: true,  shipDepthCharge: false, planeDepthCharge: false },
    periscope:   { gun: true,  torpedo: true,  bomb: true,  shipDepthCharge: true,  planeDepthCharge: true  },
    runningDeep: { gun: false, torpedo: false, bomb: false, shipDepthCharge: true,  planeDepthCharge: true  },
};

function isSubmarine(ship) {
    return ship?.type === 'submarine' || !!ship?.shipClass?.toLowerCase().includes('submarine');
}

// Descend exactly 1 level. Costs 1 AP.
function descend(submarine) {
    if (!isSubmarine(submarine)) return { success: false, message: 'Only submarines can dive.' };
    const currentIndex = DEPTH_LEVELS.indexOf(submarine.depth || 'surface');
    if (currentIndex >= DEPTH_LEVELS.length - 1) {
        return { success: false, message: 'Already at Running Deep. Cannot descend further.' };
    }
    if ((submarine.oxygen ?? 0) <= 0) {
        return { success: false, message: 'No air remaining — surface to replenish oxygen before diving.' };
    }
    submarine.depth = DEPTH_LEVELS[currentIndex + 1];
    return { success: true, message: `Descending to **${formatDepth(submarine.depth)}** depth.`, apCost: 1 };
}

// Ascend exactly 1 level. Costs 1 AP.
function ascend(submarine) {
    if (!isSubmarine(submarine)) return { success: false, message: 'Only submarines can ascend.' };
    const currentIndex = DEPTH_LEVELS.indexOf(submarine.depth || 'surface');
    if (currentIndex <= 0) {
        return { success: false, message: 'Already at Surface.' };
    }
    submarine.depth = DEPTH_LEVELS[currentIndex - 1];
    return { success: true, message: `Ascending to **${formatDepth(submarine.depth)}** depth.`, apCost: 1 };
}

// Emergency surface from any depth. Costs 1 AP. Blocks firing that turn.
function ballastBlow(submarine) {
    if (!isSubmarine(submarine)) return { success: false, message: 'Only submarines can blow ballast.' };
    if ((submarine.depth || 'surface') === 'surface') return { success: false, message: 'Already at surface.' };
    const prev = submarine.depth;
    submarine.depth = 'surface';
    submarine.ballastBlewThisTurn = true;
    return { success: true, message: `Blowing ballast — rising from **${formatDepth(prev)}** to **Surface**!`, apCost: 1 };
}

// Toggle crash dive auto-dive behavior.
function toggleCrashDive(submarine) {
    if (!isSubmarine(submarine)) return { success: false, message: 'Only submarines can use crash dive.' };
    submarine.crashDiveToggle = !submarine.crashDiveToggle;
    return { success: true, enabled: submarine.crashDiveToggle };
}

// Immediately crash-dive to runningDeep. Bypasses 1-level rule. Sets AP debt for next turn.
function executeCrashDive(submarine) {
    if (!isSubmarine(submarine)) return { success: false };
    submarine.depth = 'runningDeep';
    submarine.crashDiveApDebt = (submarine.crashDiveApDebt ?? 0) + 1;
    return { success: true };
}

// Called at start of each submarine's turn. Ticks oxygen.
// Returns { oxygenRemaining, tookDamage, damageAmount }
function processDiveTick(submarine) {
    if (!isSubmarine(submarine)) return { oxygenRemaining: null, tookDamage: false, damageAmount: 0 };
    const depth = submarine.depth || 'surface';
    const rule  = DEPTH_RULES[depth];

    if (depth === 'surface') {
        submarine.oxygen = Math.min(
            submarine.maxOxygen ?? 4,
            (submarine.oxygen ?? submarine.maxOxygen ?? 4) + rule.oxygenRegen
        );
        return { oxygenRemaining: submarine.oxygen, tookDamage: false, damageAmount: 0 };
    }

    submarine.oxygen = Math.max(0, (submarine.oxygen ?? submarine.maxOxygen ?? 4) - 1);
    if (submarine.oxygen <= 0) {
        return { oxygenRemaining: 0, tookDamage: true, damageAmount: 10 };
    }
    return { oxygenRemaining: submarine.oxygen, tookDamage: false, damageAmount: 0 };
}

// Apply/upgrade Armor Break on target. Called on torpedo critical hit.
// Returns the new tier (1, 2, or 3).
function applyArmorBreak(target) {
    const currentReduction = (target.armorBreakTurns ?? 0) > 0 ? (target.armorBreakReduction ?? 0) : 0;
    if (currentReduction === 0) {
        target.armorBreakReduction = 3;
    } else if (currentReduction === 3) {
        target.armorBreakReduction = 6;
    } else {
        target.armorBreakReduction = 9;
    }
    target.armorBreakTurns = 2;
    return target.armorBreakReduction / 3; // 1, 2, or 3
}

// Returns active ARM reduction from Armor Break (0 if inactive).
function getArmorBreakReduction(target) {
    if (!target.armorBreakTurns || target.armorBreakTurns <= 0) return 0;
    return target.armorBreakReduction ?? 0;
}

// Returns Armor Break tier (0 = none, 1/2/3).
function getArmorBreakTier(target) {
    const reduction = getArmorBreakReduction(target);
    if (reduction === 0) return 0;
    if (reduction <= 3) return 1;
    if (reduction <= 6) return 2;
    return 3;
}

// Decrement Armor Break timer. Call in processTurnEffects for every ship.
function decrementArmorBreak(target) {
    if ((target.armorBreakTurns ?? 0) > 0) {
        target.armorBreakTurns--;
        if (target.armorBreakTurns <= 0) {
            target.armorBreakReduction = 0;
        }
    }
}

// Add a spotter's ID to the submarine's wake tracking list.
function addWakeTracking(submarine, spotterId) {
    if (!submarine.wakeTrackedBy) submarine.wakeTrackedBy = [];
    if (!submarine.wakeTrackedBy.includes(spotterId)) {
        submarine.wakeTrackedBy.push(spotterId);
    }
}

// Clear wake tracking. Call at start of submarine's turn.
function clearWakeTracking(submarine) {
    submarine.wakeTrackedBy = [];
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
    return 1.0;
}

// Whether spotter can detect submarine at all (range handled separately).
function canSpot(spotter, submarine) {
    if (!isSubmarine(submarine)) return true;
    const depth = submarine.depth || 'surface';

    // Wake tracking overrides all depth concealment for 1 turn
    if (submarine.wakeTrackedBy?.includes(spotter.id)) return true;

    if (depth === 'surface' || depth === 'periscope') return true;
    // runningDeep: undetectable without sonar
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

// Set depth/oxygen/new fields on submarine at battle start. No-op for non-subs.
function initSubmarine(ship) {
    if (!isSubmarine(ship)) return;
    if (ship.depth           === undefined) ship.depth           = 'surface';
    if (ship.maxOxygen       === undefined) ship.maxOxygen       = 4;
    if (ship.oxygen          === undefined) ship.oxygen          = ship.maxOxygen;
    if (ship.crashDiveToggle === undefined) ship.crashDiveToggle = false;
    if (ship.crashDiveApDebt === undefined) ship.crashDiveApDebt = 0;
    ship.wakeTrackedBy        = [];
    ship.armorBreakTurns      = 0;
    ship.armorBreakReduction  = 0;
    ship.ballastBlewThisTurn  = false;
}

// Depth context string for turn-start messages.
function getDepthContextMessage(submarine) {
    const depth = submarine.depth || 'surface';
    const o = submarine.oxygen ?? '?', mo = submarine.maxOxygen ?? '?';
    return {
        surface:     `🌊 **Surface** | Guns, AA & Torpedoes available. Full speed. O₂: ${o}/${mo} (+2 this turn).`,
        periscope:   `🔭 **Periscope** | Torpedoes only. Enemy spot range ×0.5. Speed −50%. O₂: ${o}/${mo}.`,
        runningDeep: `🌑 **Running Deep** | Undetectable. Cannot fire. ASW weapons only can reach you. O₂: ${o}/${mo}.`,
    }[depth] ?? '';
}

function formatDepth(depth) {
    return { surface: 'Surface', periscope: 'Periscope', runningDeep: 'Running Deep' }[depth] ?? depth;
}

module.exports = {
    descend, ascend, ballastBlow, toggleCrashDive, executeCrashDive,
    processDiveTick,
    applyArmorBreak, getArmorBreakReduction, getArmorBreakTier, decrementArmorBreak,
    addWakeTracking, clearWakeTracking,
    getEffectiveSpeed, getEffectiveSpotRange, getEnemySpotMultiplier,
    canSpot, canTarget,
    initSubmarine, getDepthContextMessage, formatDepth, isSubmarine,
    DEPTH_LEVELS, DEPTH_RULES, TARGETING_MATRIX,
};
