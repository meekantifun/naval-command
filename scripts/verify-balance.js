// scripts/verify-balance.js
// Run from project root: node scripts/verify-balance.js
const FactionConfig = require('../systems/factionConfig');
const fc = new FactionConfig();

const HP_TESTS = [
    // [shipClass, tonnageT, expectedHP]
    ['Destroyer',          1800,   288],
    ['Destroyer',          2000,   300],
    ['Destroyer',          2600,   336],
    ['Submarine',          1200,   240],
    ['Submarine',          2800,   360],
    ['Light Cruiser',      5500,   735],
    ['Light Cruiser',      8200,   870],
    ['Heavy Cruiser',     10000,  1040],
    ['Heavy Cruiser',     12000,  1140],
    ['Aircraft Carrier',  25000,  1080],
    ['Aircraft Carrier',  28000,  1140],
    ['Battleship',        35000,  1230],
    ['Battleship',        40000,  1320],
    ['Battleship',        50000,  1500],
    ['Battleship',        55000,  1590],
];

let passed = 0, failed = 0;
for (const [cls, t, exp] of HP_TESTS) {
    const got = fc.calculateHP(t, cls);
    if (got === exp) {
        console.log(`  ✓  ${cls.padEnd(20)} ${String(t).padStart(6)}t → ${got}`);
        passed++;
    } else {
        console.error(`  ✗  ${cls.padEnd(20)} ${String(t).padStart(6)}t → ${got}  (expected ${exp})`);
        failed++;
    }
}

// ── playerCreation HP (same formula, different class) ──
const PlayerCreationModule = require('../handlers/playerCreation');
const pm = new PlayerCreationModule({ tempPlayerData: new Map() });

const PC_TESTS = [
    ['Destroyer',      2000,   300],
    ['Light Cruiser',  6000,   760],
    ['Battleship',    35000,  1230],
    ['Submarine',      1200,   240],
];

console.log('\n── playerCreation.js ──');
for (const [cls, t, exp] of PC_TESTS) {
    const got = pm.calculateShipHP(t, cls);
    if (got === exp) {
        console.log(`  ✓  ${cls.padEnd(20)} ${String(t).padStart(6)}t → ${got}`);
        passed++;
    } else {
        console.error(`  ✗  ${cls.padEnd(20)} ${String(t).padStart(6)}t → ${got}  (expected ${exp})`);
        failed++;
    }
}
console.log(`\n${passed}/${HP_TESTS.length + PC_TESTS.length} passed`);
process.exit(failed > 0 ? 1 : 0);
