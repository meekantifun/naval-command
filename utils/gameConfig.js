// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              GAME CONFIGURATION                              ║
// ║                         Constants and Game Data                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const AA_CALIBERS = {
  // Short-range AA (≤ 25mm)
  "7.62mm":  { "damage": 4,  "range": 1,  "accuracy": 0.45, "rateOfFire": 15, "category": "short" },
  "12.7mm":  { "damage": 8,  "range": 2,  "accuracy": 0.60, "rateOfFire": 12, "category": "short" },
  "13.2mm":  { "damage": 9,  "range": 2,  "accuracy": 0.58, "rateOfFire": 11, "category": "short" },
  "14.5mm":  { "damage": 10, "range": 2,  "accuracy": 0.60, "rateOfFire": 10, "category": "short" },
  "20mm":    { "damage": 12, "range": 3,  "accuracy": 0.65, "rateOfFire": 10, "category": "short" },
  "23mm":    { "damage": 13, "range": 3,  "accuracy": 0.66, "rateOfFire": 9,  "category": "short" },
  "25mm":    { "damage": 14, "range": 3,  "accuracy": 0.62, "rateOfFire": 9,  "category": "short" },

  // Medium-range AA (26mm–57mm)
  "28mm":    { "damage": 15, "range": 4,  "accuracy": 0.64, "rateOfFire": 7,  "category": "medium" },
  "30mm":    { "damage": 16, "range": 4,  "accuracy": 0.60, "rateOfFire": 8,  "category": "medium" },
  "35mm":    { "damage": 18, "range": 4,  "accuracy": 0.63, "rateOfFire": 7,  "category": "medium" },
  "37mm":    { "damage": 20, "range": 5,  "accuracy": 0.68, "rateOfFire": 7,  "category": "medium" },
  "40mm":    { "damage": 22, "range": 5,  "accuracy": 0.70, "rateOfFire": 6,  "category": "medium" },
  "45mm":    { "damage": 24, "range": 5,  "accuracy": 0.66, "rateOfFire": 5,  "category": "medium" },
  "50mm":    { "damage": 26, "range": 6,  "accuracy": 0.68, "rateOfFire": 4,  "category": "medium" },
  "57mm":    { "damage": 30, "range": 7,  "accuracy": 0.70, "rateOfFire": 4,  "category": "medium" },

  // Long-range AA (> 57mm)
  "75mm":    { "damage": 36, "range": 8,  "accuracy": 0.72, "rateOfFire": 3,  "category": "long" },
  "76.2mm":  { "damage": 38, "range": 8,  "accuracy": 0.74, "rateOfFire": 3,  "category": "long" },
  "76.5mm":  { "damage": 39, "range": 8,  "accuracy": 0.74, "rateOfFire": 3,  "category": "long" },
  "77mm":    { "damage": 40, "range": 8,  "accuracy": 0.74, "rateOfFire": 3,  "category": "long" },
  "80mm":    { "damage": 41, "range": 9,  "accuracy": 0.75, "rateOfFire": 2,  "category": "long" },
  "83.5mm":  { "damage": 42, "range": 9,  "accuracy": 0.75, "rateOfFire": 2,  "category": "long" },
  "85mm":    { "damage": 44, "range": 9,  "accuracy": 0.76, "rateOfFire": 2,  "category": "long" },
  "88mm":    { "damage": 46, "range": 10, "accuracy": 0.78, "rateOfFire": 2,  "category": "long" },
  "90mm":    { "damage": 48, "range": 10, "accuracy": 0.77, "rateOfFire": 2,  "category": "long" },
  "94mm":    { "damage": 50, "range": 10, "accuracy": 0.78, "rateOfFire": 2,  "category": "long" },
  "100mm":   { "damage": 52, "range": 11, "accuracy": 0.80, "rateOfFire": 2,  "category": "long" },
  "102mm":   { "damage": 53, "range": 11, "accuracy": 0.79, "rateOfFire": 2,  "category": "long" },
  "105mm":   { "damage": 55, "range": 11, "accuracy": 0.79, "rateOfFire": 2,  "category": "long" },
  "113mm":   { "damage": 58, "range": 12, "accuracy": 0.80, "rateOfFire": 2,  "category": "long" },
  "120mm":   { "damage": 64, "range": 12, "accuracy": 0.82, "rateOfFire": 2,  "category": "long" },
  "127mm":   { "damage": 68, "range": 13, "accuracy": 0.83, "rateOfFire": 2,  "category": "long" },
  "128mm":   { "damage": 70, "range": 13, "accuracy": 0.84, "rateOfFire": 2,  "category": "long" },
  "130mm":   { "damage": 72, "range": 13, "accuracy": 0.84, "rateOfFire": 2,  "category": "long" },
  "133mm":   { "damage": 74, "range": 14, "accuracy": 0.85, "rateOfFire": 2,  "category": "long" },
  "150mm":   { "damage": 80, "range": 15, "accuracy": 0.86, "rateOfFire": 1,  "category": "long" },
  "152mm":   { "damage": 82, "range": 15, "accuracy": 0.87, "rateOfFire": 1,  "category": "long" }
};

const AA_MOUNT_MULTIPLIERS = {
    'single': 1.0,
    'twin': 1.8,
    'triple': 2.5,
    'quad': 3.2,
    'sextuple': 4.5,
    'octuple': 5.5
};

const AI_CARRIER_AIRCRAFT = {
    'carrier': { hangar: 81, squadrons: [
            { type: 'fighter',        count: 12, name: 'AI Fighter Squadron' },
            { type: 'dive_bomber',    count: 12, name: 'AI Dive Bomber Squadron' },
            { type: 'torpedo_bomber', count: 12, name: 'AI Torpedo Squadron' }]
    },
    'harbor_princess': { hangar: 180, squadrons: [
            { type: 'fighter',        count: 18, name: 'Princess Fighter Squadron' },
            { type: 'dive_bomber',    count: 18, name: 'Princess Dive Bomber Squadron' },
            { type: 'torpedo_bomber', count: 18, name: 'Princess Torpedo Squadron' }]
    }
};

module.exports = {
    AA_CALIBERS,
    AA_MOUNT_MULTIPLIERS,
    AI_CARRIER_AIRCRAFT
};