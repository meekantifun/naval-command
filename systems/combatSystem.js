// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              COMBAT SYSTEM                                   ║
// ║                     Naval combat and damage calculation                      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const GameUtils = require('../utils/gameUtils');
const { AA_CALIBERS, AA_MOUNT_MULTIPLIERS } = require('../utils/gameConfig');

class CombatSystem {
    constructor(bot) {
        this.bot = bot;
    }

    async performAttack(attacker, target, game, channel, weaponType = 'main') {
        if (!attacker.alive || !target.alive) return null;

        const distance = game.calculateDistance(attacker.position, target.position);
        let weapons = attacker.weapons;

        if (weaponType === 'secondary') {
            weapons = attacker.secondaryWeapons || [];
        } else if (weaponType === 'aa') {
            weapons = attacker.aaWeapons || [];
        }

        if (!weapons || weapons.length === 0) {
            const attackerName = GameUtils.getEntityName(attacker);
            return { hit: false, message: `${attackerName} has no ${weaponType} weapons!` };
        }

        let totalDamage = 0;
        let hitMessages = [];
        let anyHit = false;

        for (const weapon of weapons) {
            const result = await this.calculateWeaponDamage(weapon, attacker, target, distance);

            if (result.hit) {
                anyHit = true;
                totalDamage += result.damage;
                hitMessages.push(result.message);

                // Apply status effects
                if (result.statusEffects) {
                    this.applyStatusEffects(target, result.statusEffects);
                }
            } else {
                hitMessages.push(result.message);
            }
        }

        if (totalDamage > 0) {
            const oldHp = target.hp;
            target.hp = Math.max(0, target.hp - totalDamage);

            const damageDealt = oldHp - target.hp;

            if (target.hp <= 0) {
                target.alive = false;
                const targetName = GameUtils.getEntityName(target);
                hitMessages.push(`💀 ${targetName} has been sunk!`);
            }
        }

        return {
            hit: anyHit,
            damage: totalDamage,
            messages: hitMessages,
            targetDestroyed: !target.alive
        };
    }

    async calculateWeaponDamage(weapon, attacker, target, distance) {
        const baseAccuracy = weapon.accuracy || 0.7;
        const range = weapon.range || 10;

        // Range penalty
        let accuracy = baseAccuracy;
        if (distance > range) {
            const rangePenalty = Math.min(0.8, (distance - range) * 0.1);
            accuracy = Math.max(0.1, accuracy - rangePenalty);
        }

        // Evasion check
        if (target.speed && target.displacement) {
            const evasionChance = GameUtils.calculateShipEvasion(target.speed, target.displacement) / 100;
            accuracy *= (1 - evasionChance);
        }

        // Hit roll
        const hitRoll = Math.random();
        const hit = hitRoll <= accuracy;

        if (!hit) {
            const targetName = GameUtils.getEntityName(target);
            return {
                hit: false,
                damage: 0,
                message: `💨 ${weapon.name} missed ${targetName}!`
            };
        }

        // Calculate damage
        let damage = weapon.damage || 50;

        // Critical hit check (10% chance)
        const critRoll = Math.random();
        const isCritical = critRoll <= 0.1;

        if (isCritical) {
            damage *= 2;
        }

        // Armor reduction
        if (target.armor) {
            const armorReduction = Math.min(0.8, target.armor / 100);
            damage *= (1 - armorReduction);
        }

        damage = Math.floor(damage);

        let statusEffects = [];

        // Fire chance for explosive weapons
        if (weapon.type === 'HE' || weapon.name.includes('HE')) {
            const fireRoll = Math.random();
            if (fireRoll <= 0.15) { // 15% fire chance
                statusEffects.push({ type: 'fire', duration: 3 });
            }
        }

        // Flooding chance for torpedoes
        if (weapon.type === 'torpedo') {
            const floodRoll = Math.random();
            if (floodRoll <= 0.3) { // 30% flooding chance
                statusEffects.push({ type: 'flooding', duration: 4 });
            }
        }

        const critText = isCritical ? ' **CRITICAL HIT!**' : '';
        const targetName = GameUtils.getEntityName(target);
        const message = `🎯 ${weapon.name} hit ${targetName} for ${damage} damage!${critText}`;

        return {
            hit: true,
            damage: damage,
            message: message,
            statusEffects: statusEffects.length > 0 ? statusEffects : null,
            critical: isCritical
        };
    }

    applyStatusEffects(target, statusEffects) {
        for (const effect of statusEffects) {
            switch (effect.type) {
                case 'fire':
                    target.onFire = true;
                    target.fireTimer = effect.duration;
                    target.statusEffects = target.statusEffects || {};
                    target.statusEffects.fire = effect.duration;
                    break;
                case 'flooding':
                    target.flooding = true;
                    target.floodTimer = effect.duration;
                    target.statusEffects = target.statusEffects || {};
                    target.statusEffects.flooding = effect.duration;
                    break;
            }
        }
    }

    calculateAADefense(ship, incomingAircraft) {
        if (!ship.aaWeapons || ship.aaWeapons.length === 0) {
            const shipName = GameUtils.getEntityName(ship);
            return { damage: 0, hits: 0, message: `${shipName} has no AA weapons.` };
        }

        let totalDamage = 0;
        let hits = 0;
        let messages = [];

        for (const aaWeapon of ship.aaWeapons) {
            const caliber = aaWeapon.caliber;
            const mount = aaWeapon.mount || 'single';
            const count = aaWeapon.count || 1;

            if (!AA_CALIBERS[caliber]) continue;

            const weaponStats = AA_CALIBERS[caliber];
            const mountMultiplier = AA_MOUNT_MULTIPLIERS[mount] || 1.0;

            const weaponDamage = weaponStats.damage * mountMultiplier * count;
            const accuracy = weaponStats.accuracy;
            const rateOfFire = weaponStats.rateOfFire;

            // Calculate shots per aircraft
            const shotsPerAircraft = Math.floor(rateOfFire / incomingAircraft.length);

            for (let i = 0; i < shotsPerAircraft; i++) {
                const hitRoll = Math.random();
                if (hitRoll <= accuracy) {
                    hits++;
                    totalDamage += weaponDamage;
                }
            }

            if (hits > 0) {
                messages.push(`🔫 ${count}x ${mount} ${caliber} AA scored ${hits} hits`);
            }
        }

        return {
            damage: totalDamage,
            hits: hits,
            messages: messages
        };
    }

    processTurnEffects(entity, game) {
        const messages = [];

        if (!entity.statusEffects) return messages;

        // Process fire damage
        if (entity.statusEffects.fire > 0) {
            const entityName = GameUtils.getEntityName(entity);
            const fireDamage = Math.floor(entity.maxHp * 0.05); // 5% max HP per turn
            entity.hp = Math.max(0, entity.hp - fireDamage);
            entity.statusEffects.fire--;

            messages.push(`🔥 ${entityName} takes ${fireDamage} fire damage!`);

            if (entity.statusEffects.fire <= 0) {
                entity.onFire = false;
                entity.fireTimer = 0;
                delete entity.statusEffects.fire;
                messages.push(`🧯 Fire aboard ${entityName} has been extinguished.`);
            }
        }

        // Process flooding damage
        if (entity.statusEffects.flooding > 0) {
            const entityName = GameUtils.getEntityName(entity);
            const floodDamage = Math.floor(entity.maxHp * 0.03); // 3% max HP per turn
            entity.hp = Math.max(0, entity.hp - floodDamage);
            entity.statusEffects.flooding--;

            messages.push(`🌊 ${entityName} takes ${floodDamage} flooding damage!`);

            if (entity.statusEffects.flooding <= 0) {
                entity.flooding = false;
                entity.floodTimer = 0;
                delete entity.statusEffects.flooding;
                messages.push(`⚒️ Flooding aboard ${entityName} has been controlled.`);
            }
        }

        // Check if entity was destroyed by status effects
        if (entity.hp <= 0 && entity.alive) {
            entity.alive = false;
            const entityName = GameUtils.getEntityName(entity);
            messages.push(`💀 ${entityName} has been lost to damage!`);
        }

        return messages;
    }

    calculateDamageReduction(armor, penetration) {
        if (!armor || armor <= 0) return 0;
        if (!penetration || penetration <= 0) return 0.8; // Max reduction without penetration

        const armorEffectiveness = Math.max(0, armor - penetration);
        return Math.min(0.8, armorEffectiveness / 100); // Max 80% reduction
    }
}

module.exports = CombatSystem;