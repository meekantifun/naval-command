// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              LEVELING SYSTEM MODULE                          ║
// ║                           CREATED BY: MEEKANTIFUN                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { EmbedBuilder } = require('discord.js');

class LevelingSystem {
    constructor(bot) {
    this.bot = bot;
    this.equipmentConfig = {

    // Maximum level for any equipment
    maxLevel: 50,
    // Base XP required for equipment level 2
    baseXP: 50,
    // XP multiplier per level
    xpMultiplier: 1.3,
    // Stat increase per level (as percentage)
    statBonusPerLevel: 2.5, // 2.5% increase per level
    // XP gained per action type

    xpGains: {
    hit: 10,        // XP for hitting a target
    kill: 25,       // XP for destroying an enemy
    critical: 15,   // XP for critical hits
    use: 5          // XP for using the equipment
    }
    
    };

        this.skillThresholds = this.initializeSkillThresholds();
    }

    initializeSkillThresholds() {
        return {
            'Novice': { 
                minLevel: 1, 
                maxLevel: 10, 
                description: 'Basic equipment proficiency',
                color: 0x808080, // Gray
                icon: '🔸'
            },
            'Advanced': { 
                minLevel: 11, 
                maxLevel: 25, 
                description: 'Experienced equipment handling',
                color: 0x0099FF, // Blue
                icon: '🔹'
            },
            'Expert': { 
                minLevel: 26, 
                maxLevel: 40, 
                description: 'Master-level equipment expertise',
                color: 0x9932CC, // Purple
                icon: '💎'
            },
            'Ace': { 
                minLevel: 41, 
                maxLevel: 50, 
                description: 'Legendary equipment mastery',
                color: 0xFFD700, // Gold
                icon: '⭐'
            }
        };
    }

    // Initialize equipment entry in player data
    initializeEquipment(playerId, equipmentId, equipmentName) {
        const playerData = this.bot.playerData.get(playerId);
        if (!playerData) return false;

        if (!playerData.equipmentLevels) {
            playerData.equipmentLevels = new Map();
        }

        if (!playerData.equipmentLevels.has(equipmentId)) {
            playerData.equipmentLevels.set(equipmentId, {
                id: equipmentId,
                name: equipmentName,
                level: 1,
                experience: 0,
                timesUsed: 0,
                enemiesKilled: 0,
                shotsHit: 0,
                criticalHits: 0
            });
            this.bot.savePlayerData();
        }

        return true;
    }

    // Get equipment data for a player
    getEquipmentData(playerId, equipmentId) {
        const playerData = this.bot.playerData.get(playerId);
        if (!playerData || !playerData.equipmentLevels) return null;
        
        return playerData.equipmentLevels.get(equipmentId) || null;
    }

    // Award XP to specific equipment
    async awardEquipmentXP(playerId, equipmentId, xpAmount, actionType = 'use', channel = null) {
        const playerData = this.bot.playerData.get(playerId);
        if (!playerData || !playerData.equipmentLevels) return null;

        const equipment = playerData.equipmentLevels.get(equipmentId);
        if (!equipment) return null;

        const oldLevel = equipment.level;
        equipment.experience += xpAmount;
        equipment.timesUsed++;

        // Update action-specific stats
        switch (actionType) {
            case 'hit':
                equipment.shotsHit++;
                break;
            case 'kill':
                equipment.enemiesKilled++;
                break;
            case 'critical':
                equipment.criticalHits++;
                break;
        }

        const newLevel = this.calculateEquipmentLevel(equipment.experience);
        equipment.level = Math.min(newLevel, this.equipmentConfig.maxLevel);

        this.bot.savePlayerData();

        const result = {
            oldLevel,
            newLevel: equipment.level,
            xpGained: xpAmount,
            leveledUp: equipment.level > oldLevel,
            thresholdChanged: false
        };

        // Check for threshold changes
        if (result.leveledUp) {
            const oldThreshold = this.getSkillThreshold(oldLevel);
            const newThreshold = this.getSkillThreshold(equipment.level);
            
            if (oldThreshold.name !== newThreshold.name) {
                result.thresholdChanged = true;
                result.oldThreshold = oldThreshold.name;
                result.newThreshold = newThreshold.name;
                
                // Send threshold change notification
                if (channel) {
                    await this.announceThresholdChange(playerId, equipment, oldThreshold, newThreshold, channel);
                }
            }
        }

        return result;
    }

    // Calculate equipment level based on XP
    calculateEquipmentLevel(totalXP) {
        if (totalXP < 0) return 1;
        
        let level = 1;
        let accumulatedXP = 0;
        
        while (level < this.equipmentConfig.maxLevel) {
            const xpForNextLevel = this.calculateXPRequired(level + 1);
            if (accumulatedXP + xpForNextLevel > totalXP) {
                break;
            }
            accumulatedXP += xpForNextLevel;
            level++;
        }
        
        return level;
    }

    // Calculate XP required for specific equipment level
    calculateXPRequired(level) {
        if (level <= 1) return 0;
        return Math.floor(this.equipmentConfig.baseXP * Math.pow(this.equipmentConfig.xpMultiplier, level - 2));
    }

    // Get skill threshold for equipment level
    getSkillThreshold(level) {
        for (const [thresholdName, threshold] of Object.entries(this.skillThresholds)) {
            if (level >= threshold.minLevel && level <= threshold.maxLevel) {
                return {
                    name: thresholdName,
                    ...threshold
                };
            }
        }
        return { name: 'Novice', ...this.skillThresholds['Novice'] };
    }

    // Calculate equipment effectiveness with level bonus
    calculateEquipmentEffectiveness(baseValue, equipmentLevel) {
        const bonusPercentage = (equipmentLevel - 1) * this.equipmentConfig.statBonusPerLevel;
        const bonusMultiplier = 1 + (bonusPercentage / 100);
        const finalValue = Math.floor(baseValue * bonusMultiplier);
        
        return {
            baseValue: baseValue,
            bonusPercentage: Math.round(bonusPercentage * 10) / 10, // Round to 1 decimal
            finalValue: finalValue,
            level: equipmentLevel
        };
    }

    // Get equipment XP progress within current level
    getEquipmentXPProgress(equipment) {
        if (equipment.level >= this.equipmentConfig.maxLevel) {
            return { current: 0, required: 0, percentage: 100 };
        }
        
        const totalXPForCurrentLevel = this.calculateTotalXPForLevel(equipment.level);
        const currentXPInLevel = equipment.experience - totalXPForCurrentLevel;
        const xpRequiredForNext = this.calculateXPRequired(equipment.level + 1);
        const percentage = Math.round((currentXPInLevel / xpRequiredForNext) * 100);
        
        return {
            current: currentXPInLevel,
            required: xpRequiredForNext,
            percentage: Math.min(percentage, 100)
        };
    }

    // Calculate total XP needed for equipment level
    calculateTotalXPForLevel(level) {
        let totalXP = 0;
        for (let i = 2; i <= level; i++) {
            totalXP += this.calculateXPRequired(i);
        }
        return totalXP;
    }

    // Announce threshold change
    async announceThresholdChange(playerId, equipment, oldThreshold, newThreshold, channel) {
        const embed = new EmbedBuilder()
            .setTitle('🎉 EQUIPMENT MASTERY BREAKTHROUGH!')
            .setDescription(`<@${playerId}>'s **${equipment.name}** has reached **${newThreshold.name}** mastery!`)
            .addFields([
                {
                    name: '📈 Threshold Change',
                    value: `${oldThreshold.icon} ${oldThreshold.name} → ${newThreshold.icon} ${newThreshold.name}`,
                    inline: true
                },
                {
                    name: '📊 Equipment Level',
                    value: `Level ${equipment.level}`,
                    inline: true
                },
                {
                    name: '⚡ Total Bonus',
                    value: `+${((equipment.level - 1) * this.equipmentConfig.statBonusPerLevel).toFixed(1)}%`,
                    inline: true
                }
            ])
            .setColor(newThreshold.color)
            .setTimestamp();

        await channel.send({ embeds: [embed] });
    }

    // Create equipment stats embed
    createEquipmentStatsEmbed(playerId, equipmentId = null) {
        const playerData = this.bot.playerData.get(playerId);
        if (!playerData || !playerData.equipmentLevels) {
            return null;
        }

        if (equipmentId) {
            // Show specific equipment stats
            const equipment = playerData.equipmentLevels.get(equipmentId);
            if (!equipment) return null;

            return this.createSingleEquipmentEmbed(equipment, playerData.username);
        } else {
            // Show all equipment stats
            return this.createAllEquipmentEmbed(playerData);
        }
    }

    createSingleEquipmentEmbed(equipment, username) {
        const threshold = this.getSkillThreshold(equipment.level);
        const xpProgress = this.getEquipmentXPProgress(equipment);
        const effectiveness = this.calculateEquipmentEffectiveness(100, equipment.level);
        const progressBar = this.createProgressBar(xpProgress.percentage);

        const embed = new EmbedBuilder()
            .setTitle(`${threshold.icon} ${equipment.name} - ${threshold.name}`)
            .setDescription(`Equipment mastery for ${username}`)
            .addFields([
                {
                    name: '📊 Level & Progress',
                    value: `**Level ${equipment.level}** / ${this.equipmentConfig.maxLevel}\n` +
                           `${xpProgress.current} / ${xpProgress.required} XP\n` +
                           `${progressBar} ${xpProgress.percentage}%`,
                    inline: true
                },
                {
                    name: '⚡ Effectiveness Bonus',
                    value: `+${effectiveness.bonusPercentage}%\n` +
                           `*(Base 100 → ${effectiveness.finalValue})*`,
                    inline: true
                },
                {
                    name: '🎯 Usage Statistics',
                    value: `**Times Used:** ${equipment.timesUsed}\n` +
                           `**Hits:** ${equipment.shotsHit}\n` +
                           `**Kills:** ${equipment.enemiesKilled}\n` +
                           `**Criticals:** ${equipment.criticalHits}`,
                    inline: true
                },
                {
                    name: '📈 Mastery Level',
                    value: `${threshold.icon} **${threshold.name}**\n${threshold.description}`,
                    inline: false
                }
            ])
            .setColor(threshold.color)
            .setTimestamp();

        return embed;
    }

    createAllEquipmentEmbed(playerData) {
        const equipmentList = Array.from(playerData.equipmentLevels.values());
        
        if (equipmentList.length === 0) {
            const embed = new EmbedBuilder()
                .setTitle('📦 Equipment Mastery')
                .setDescription('No equipment data found. Use equipment in battle to start tracking mastery!')
                .setColor(0x808080);
            return embed;
        }

        const equipmentFields = equipmentList.slice(0, 10).map(equipment => {
            const threshold = this.getSkillThreshold(equipment.level);
            const effectiveness = this.calculateEquipmentEffectiveness(100, equipment.level);
            
            return {
                name: `${threshold.icon} ${equipment.name}`,
                value: `**Level ${equipment.level}** (${threshold.name})\n` +
                       `+${effectiveness.bonusPercentage}% effectiveness\n` +
                       `Used ${equipment.timesUsed} times`,
                inline: true
            };
        });

        const embed = new EmbedBuilder()
            .setTitle(`📦 Equipment Mastery - ${playerData.username}`)
            .setDescription('Your equipment mastery levels and bonuses:')
            .addFields(equipmentFields)
            .setColor(0x0099FF)
            .setTimestamp();

        if (equipmentList.length > 10) {
            embed.setFooter({ text: `Showing 10 of ${equipmentList.length} equipment items` });
        }

        return embed;
    }

    // Create visual progress bar
    createProgressBar(percentage, length = 10) {
        const filled = Math.round((percentage / 100) * length);
        const empty = length - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }

    // Award XP based on combat action
    async awardCombatXP(playerId, equipmentType, actionType, channel = null) {
        const xpAmount = this.equipmentConfig.xpGains[actionType] || 0;
        if (xpAmount > 0) {
            await this.awardEquipmentXP(playerId, equipmentType, xpAmount, actionType, channel);
        }
    }
}
module.exports = LevelingSystem;