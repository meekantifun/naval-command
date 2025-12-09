// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                               SHOP SYSTEM MODULE                             ║
// ║                           CREATED BY: MEEKANTIFUN                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

class ShopSystem {
	constructor(bot) {
	this.bot = bot;
	this.shopItems = new Map();
	this.categories = new Map();
	this.initializeShop();
	}
	initializeShop() {
	    // Equipment Category
	    this.addCategory('equipment', 'Equipment', '⚙️', 'Ship equipment and modifications');
	    
	    // Weapons Category
	    this.addCategory('weapons', 'Weapons', '🔫', 'Weapon systems and ammunition');
	    
	    // Aircraft Category
	    this.addCategory('aircraft', 'Aircraft', '✈️', 'Aircraft and aviation equipment');
	    
	    // Consumables Category
	    this.addCategory('consumables', 'Consumables', '📦', 'Single-use items and supplies');

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                               EQUIPMENT MODULES                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
	    
	    this.addItem('advanced_radar', {
	        name: 'Advanced Radar System',
	        category: 'equipment',
	        price: 500,
	        description: 'Increases accuracy by 10% and detection range by 2 cells',
	        type: 'equipment',
	        rarity: 'common',
	        stats: { accuracy: 10, range: 2 },
	        requirements: { level: 3 },
	        stackable: false,
	        emoji: '📡'
	    });

	    this.addItem('reinforced_armor', {
	        name: 'Reinforced Armor Plating',
	        category: 'equipment',
	        price: 800,
	        description: 'Increases armor by 20 points, reducing incoming damage',
	        type: 'equipment',
	        rarity: 'common',
	        stats: { armor: 20 },
	        requirements: { level: 5 },
	        stackable: false,
	        emoji: '🛡️'
	    });

	    this.addItem('improved_engines', {
	        name: 'Improved Engine System',
	        category: 'equipment',
	        price: 1200,
	        description: 'Increases speed by 1 and evasion by 5%',
	        type: 'equipment',
	        rarity: 'uncommon',
	        stats: { speed: 1, evasion: 5 },
	        requirements: { level: 8, shipClass: ['Destroyer', 'Light Cruiser'] },
	        stackable: false,
	        emoji: '⚡'
	    });

	    this.addItem('fire_control_system', {
	        name: 'Advanced Fire Control',
	        category: 'equipment',
	        price: 2000,
	        description: 'Reduces weapon reload time and increases accuracy by 15%',
	        type: 'equipment',
	        rarity: 'rare',
	        stats: { accuracy: 15, reload_speed: 20 },
	        requirements: { level: 12 },
	        stackable: false,
	        emoji: '🎯'
	    });

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                                 WEAPON ITEMS                                 ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

	    this.addItem('sh_ap_shells', {
	        name: 'Super Heavy Armor Piercing Shells',
	        category: 'weapons',
	        price: 100,
	        description: 'High-penetration ammunition for main guns (x20 rounds)',
	        type: 'ammunition',
	        rarity: 'common',
	        stats: { penetration: 25 },
	        requirements: {},
	        stackable: true,
	        maxStack: 5,
	        emoji: '💥'
	    });

	    this.addItem('he_shells', {
	        name: 'High Explosive Shells',
	        category: 'weapons',
	        price: 80,
	        description: 'High-damage ammunition with fire chance (x20 rounds)',
	        type: 'ammunition',
	        rarity: 'common',
	        stats: { damage: 15, fire_chance: 30 },
	        requirements: {},
	        stackable: true,
	        maxStack: 5,
	        emoji: '🔥'
	    });

	    this.addItem('torpedo_upgrade', {
	        name: 'Mark VIII Torpedoes',
	        category: 'weapons',
	        price: 1500,
	        description: 'Upgraded torpedoes with increased damage and flooding chance',
	        type: 'weapon_upgrade',
	        rarity: 'uncommon',
	        stats: { torpedo_damage: 40, flooding_chance: 25 },
	        requirements: { level: 6, hasTorpedoes: true },
	        stackable: false,
	        emoji: '🚀'
	    });

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                                AIRCRAFT ITEMS                                ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

	    this.addItem('fighter_squadron', {
	        name: 'F4F Wildcat Squadron',
	        category: 'aircraft',
	        price: 2500,
	        description: 'Additional fighter squadron for aircraft carriers',
	        type: 'aircraft',
	        rarity: 'rare',
	        aircraftType: 'fighter',
	        squadronData: {
	            name: 'F4F Wildcat',
	            damage: 45,
	            range: 15,
	            quality: 'Standard',
	            specialAbility: 'Air Superiority'
	        },
	        requirements: { level: 10, shipClass: ['Aircraft Carrier'] },
	        stackable: true,
	        maxStack: 3,
	        emoji: '✈️'
	    });

	    this.addItem('dive_bomber_squadron', {
	        name: 'SBD Dauntless Squadron',
	        category: 'aircraft',
	        price: 3000,
	        description: 'Dive bomber squadron effective against ships',
	        type: 'aircraft',
	        rarity: 'rare',
	        aircraftType: 'dive_bomber',
	        squadronData: {
	            name: 'SBD Dauntless',
	            damage: 80,
	            range: 12,
	            quality: 'Standard',
	            specialAbility: 'Precision Strike'
	        },
	        requirements: { level: 12, shipClass: ['Aircraft Carrier'] },
	        stackable: true,
	        maxStack: 2,
	        emoji: '💣'
	    });

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              CONSUMABLE ITEMS                                ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

	    this.addItem('repair_kit', {
	        name: 'Emergency Repair Kit',
	        category: 'consumables',
	        price: 200,
	        description: 'Instantly repairs 50 HP and removes all status effects',
	        type: 'consumable',
	        rarity: 'common',
	        effect: 'heal',
	        healAmount: 50,
	        removeEffects: true,
	        requirements: {},
	        stackable: true,
	        maxStack: 10,
	        emoji: '🔧'
	    });

	    this.addItem('fuel_barrels', {
	        name: 'Extra Fuel Barrels',
	        category: 'consumables',
	        price: 150,
	        description: 'Extends aircraft fuel by 5 turns',
	        type: 'consumable',
	        rarity: 'common',
	        effect: 'fuel',
	        fuelBonus: 5,
	        requirements: { shipClass: ['Aircraft Carrier'] },
	        stackable: true,
	        maxStack: 5,
	        emoji: '⛽'
	    });

	    this.addItem('smoke_screen', {
	        name: 'Smoke Screen Generator',
	        category: 'consumables',
	        price: 300,
	        description: 'Creates smoke screen, increasing evasion by 50% for 3 turns',
	        type: 'consumable',
	        rarity: 'uncommon',
	        effect: 'smoke',
	        evasionBonus: 50,
	        duration: 3,
	        requirements: { level: 5 },
	        stackable: true,
	        maxStack: 3,
	        emoji: '💨'
	    });

	    this.addItem('lucky_charm', {
	        name: 'Admiral\'s Lucky Charm',
	        category: 'consumables',
	        price: 1000,
	        description: 'Increases critical hit chance by 25% for the entire battle',
	        type: 'consumable',
	        rarity: 'legendary',
	        effect: 'luck',
	        critBonus: 25,
	        duration: 'battle',
	        requirements: { level: 15 },
	        stackable: true,
	        maxStack: 1,
	        emoji: '🍀'
	    });
	}

	addCategory(id, name, emoji, description) {
	    this.categories.set(id, {
	        id,
	        name,
	        emoji,
	        description
	    });
	}

	addItem(id, itemData) {
	    this.shopItems.set(id, {
	        id,
	        ...itemData
	    });
	}

	getItem(id) {
	    return this.shopItems.get(id);
	}

	getItemsByCategory(categoryId) {
	    return Array.from(this.shopItems.values()).filter(item => item.category === categoryId);
	}

	getAllCategories() {
	    return Array.from(this.categories.values());
	}

	async showShop(interaction, categoryId = null) {
	    if (categoryId) {
	        return await this.showCategoryItems(interaction, categoryId);
	    }

	    // Show category selection
	    const categories = this.getAllCategories();
	    const categoryButtons = categories.map(category => 
	        new ButtonBuilder()
	            .setCustomId(`shop_category_${category.id}_${interaction.user.id}`)
	            .setLabel(`${category.emoji} ${category.name}`)
	            .setStyle(ButtonStyle.Primary)
	    );

	    // Add currency display and close button
	    categoryButtons.push(
	        new ButtonBuilder()
	            .setCustomId(`shop_close_${interaction.user.id}`)
	            .setLabel('Close Shop')
	            .setStyle(ButtonStyle.Secondary)
	    );

	    const actionRows = [];
	    for (let i = 0; i < categoryButtons.length; i += 5) {
	        actionRows.push(new ActionRowBuilder().addComponents(categoryButtons.slice(i, i + 5)));
	    }

	    const playerData = this.bot.playerData.get(interaction.user.id);
	    const currency = playerData?.currency || 0;

	    const shopEmbed = new EmbedBuilder()
	        .setTitle('🛒 Naval Equipment Shop')
	        .setDescription('Welcome to the Naval Equipment Shop! Select a category to browse items.\n\n' +
	                       `💰 **Your Currency:** ${currency} credits\n\n` +
	                       '**Categories:**\n' +
	                       categories.map(cat => `${cat.emoji} **${cat.name}** - ${cat.description}`).join('\n'))
	        .setColor(0x00FF00)
	        .setFooter({ text: 'Purchase items to enhance your ship\'s capabilities!' });

	    await interaction.reply({ embeds: [shopEmbed], components: actionRows, flags: MessageFlags.Ephemeral });
	}

	async showCategoryItems(interaction, categoryId) {
	    const category = this.categories.get(categoryId);
	    if (!category) {
	        return interaction.update({ content: '❌ Category not found!', embeds: [], components: [] });
	    }

	    const items = this.getItemsByCategory(categoryId);
	    const playerData = this.bot.playerData.get(interaction.user.id);
	    const currency = playerData?.currency || 0;

	    if (items.length === 0) {
	        return interaction.update({ 
	            content: `${category.emoji} **${category.name}** category is currently empty.`,
	            embeds: [], 
	            components: [this.createBackButton(interaction.user.id)]
	        });
	    }

	    // Create item buttons (max 20 items per page)
	    const itemButtons = items.slice(0, 20).map(item => {
	        const affordable = currency >= item.price;
	        const meetsRequirements = this.checkRequirements(item, playerData);
	        
	        return new ButtonBuilder()
	            .setCustomId(`shop_buy_${item.id}_${interaction.user.id}`)
	            .setLabel(`${item.emoji} ${item.name} (${item.price}¢)`)
	            .setStyle(affordable && meetsRequirements ? ButtonStyle.Success : ButtonStyle.Secondary)
	            .setDisabled(!affordable || !meetsRequirements);
	    });

	    // Add navigation buttons
	    itemButtons.push(
	        new ButtonBuilder()
	            .setCustomId(`shop_back_${interaction.user.id}`)
	            .setLabel('← Back to Categories')
	            .setStyle(ButtonStyle.Primary)
	    );

	    const actionRows = [];
	    for (let i = 0; i < itemButtons.length; i += 5) {
	        actionRows.push(new ActionRowBuilder().addComponents(itemButtons.slice(i, i + 5)));
	    }

	    const itemDescriptions = items.slice(0, 10).map(item => {
	        const affordable = currency >= item.price;
	        const meetsRequirements = this.checkRequirements(item, playerData);
	        const statusIcon = affordable && meetsRequirements ? '✅' : '❌';
	        
	        let description = `${statusIcon} **${item.name}** - ${item.price} credits\n${item.description}`;
	        
	        if (item.requirements && Object.keys(item.requirements).length > 0) {
	            description += `\n*Requirements: ${this.formatRequirements(item.requirements)}*`;
	        }
	        
	        return description;
	    }).join('\n\n');

	    const categoryEmbed = new EmbedBuilder()
	        .setTitle(`${category.emoji} ${category.name}`)
	        .setDescription(`${category.description}\n\n` +
	                       `💰 **Your Currency:** ${currency} credits\n\n` +
	                       `**Available Items:**\n${itemDescriptions}`)
	        .setColor(0x0099FF)
	        .setFooter({ text: 'Click on an item to purchase it!' });

	    await interaction.update({ embeds: [categoryEmbed], components: actionRows });
	}

	checkRequirements(item, playerData) {
	    if (!item.requirements || Object.keys(item.requirements).length === 0) {
	        return true;
	    }

	    const requirements = item.requirements;
	    
	    // Check level requirement
	    if (requirements.level && (!playerData || playerData.level < requirements.level)) {
	        return false;
	    }

	    // Check ship class requirement
	    if (requirements.shipClass) {
	        const activeCharacter = this.getActiveCharacter(playerData);
	        if (!activeCharacter || !requirements.shipClass.includes(activeCharacter.shipClass)) {
	            return false;
	        }
	    }

	    // Check torpedo requirement
	    if (requirements.hasTorpedoes) {
	        const activeCharacter = this.getActiveCharacter(playerData);
	        if (!activeCharacter || !activeCharacter.hasTorpedoes) {
	            return false;
	        }
	    }

	    return true;
	}

	getActiveCharacter(playerData) {
	    if (!playerData || !playerData.activeCharacter || !playerData.characters) {
	        return null;
	    }
	    
	    if (playerData.characters instanceof Map) {
	        return playerData.characters.get(playerData.activeCharacter);
	    } else if (typeof playerData.characters === 'object') {
	        return playerData.characters[playerData.activeCharacter];
	    }
	    
	    return null;
	}

	formatRequirements(requirements) {
	    const parts = [];
	    
	    if (requirements.level) {
	        parts.push(`Level ${requirements.level}`);
	    }
	    
	    if (requirements.shipClass) {
	        parts.push(`Ship: ${requirements.shipClass.join(' or ')}`);
	    }
	    
	    if (requirements.hasTorpedoes) {
	        parts.push('Torpedo-capable ship');
	    }
	    
	    return parts.join(', ');
	}

	createBackButton(userId) {
	    return new ActionRowBuilder().addComponents(
	        new ButtonBuilder()
	            .setCustomId(`shop_back_${userId}`)
	            .setLabel('← Back to Categories')
	            .setStyle(ButtonStyle.Primary)
	    );
	}

	async handleShopInteraction(interaction) {
	    const customId = interaction.customId;
	    const userId = customId.split('_').pop();

	    if (userId !== interaction.user.id) {
	        return interaction.reply({ content: '❌ This is not your shop interaction!', flags: MessageFlags.Ephemeral });
	    }

	    if (customId.includes('shop_category_')) {
	        const categoryId = customId.split('_')[2];
	        await this.showCategoryItems(interaction, categoryId);
	    } else if (customId.includes('shop_buy_')) {
	        const itemId = customId.split('_')[2];
	        await this.handlePurchase(interaction, itemId);
	    } else if (customId.includes('shop_back_')) {
	        await this.showShop(interaction);
	    } else if (customId.includes('shop_close_')) {
	        await interaction.update({ 
	            content: '🛒 Thank you for visiting the Naval Equipment Shop!', 
	            embeds: [], 
	            components: [] 
	        });
	    }
	}

	async handlePurchase(interaction, itemId) {
	    const item = this.getItem(itemId);
	    if (!item) {
	        return interaction.update({ content: '❌ Item not found!', embeds: [], components: [] });
	    }

	    const playerData = this.bot.playerData.get(interaction.user.id);
	    if (!playerData) {
	        return interaction.update({ content: '❌ Player data not found!', embeds: [], components: [] });
	    }

	    // Check currency
	    if (playerData.currency < item.price) {
	        return interaction.reply({ 
	            content: `❌ Insufficient funds! You need ${item.price} credits but only have ${playerData.currency}.`, 
	            flags: MessageFlags.Ephemeral 
	        });
	    }

	    // Check requirements
	    if (!this.checkRequirements(item, playerData)) {
	        return interaction.reply({ 
	            content: `❌ You don't meet the requirements for this item: ${this.formatRequirements(item.requirements)}`, 
	            flags: MessageFlags.Ephemeral 
	        });
	    }

	    // Process purchase
	    playerData.currency -= item.price;
	    
	    // Add item to inventory
	    if (!playerData.inventory) {
	        playerData.inventory = new Map();
	    }

	    const currentAmount = playerData.inventory.get(itemId) || 0;
	    playerData.inventory.set(itemId, currentAmount + 1);

	    // Save data
	    this.bot.savePlayerData();

	    const purchaseEmbed = new EmbedBuilder()
	        .setTitle('✅ Purchase Successful!')
	        .setDescription(`You have purchased **${item.name}** for ${item.price} credits!\n\n` +
	                       `${item.description}\n\n` +
	                       `💰 **Remaining Currency:** ${playerData.currency} credits`)
	        .setColor(0x00FF00)
	        .setFooter({ text: 'Use /equip to use your purchased items!' });

	    await interaction.update({ embeds: [purchaseEmbed], components: [this.createBackButton(interaction.user.id)] });
	}
}

module.exports = ShopSystem;