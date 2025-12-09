// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          STAFF ROLE MANAGER                                  ║
// ║               Per-server configurable staff role system                      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const fs = require('fs');
const path = require('path');

class StaffRoleManager {
    constructor(bot) {
        this.bot = bot;
    }

    /**
     * Get the staff role ID for a guild
     */
    getStaffRoleId(guildId) {
        const configPath = this.getConfigPath(guildId);

        if (fs.existsSync(configPath)) {
            try {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                return config.staffRoleId || null;
            } catch (error) {
                console.error(`Error reading staff role config for guild ${guildId}:`, error);
                return null;
            }
        }

        return null;
    }

    /**
     * Set the staff role ID for a guild
     */
    setStaffRoleId(guildId, roleId) {
        const configPath = this.getConfigPath(guildId);
        const guildFolder = path.dirname(configPath);

        // Ensure guild folder exists
        if (!fs.existsSync(guildFolder)) {
            fs.mkdirSync(guildFolder, { recursive: true });
        }

        // Load or create config
        let config = {};
        if (fs.existsSync(configPath)) {
            try {
                config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            } catch (error) {
                console.warn(`Error loading config for guild ${guildId}, creating new:`, error);
            }
        }

        // Update staff role
        config.staffRoleId = roleId;

        // Save config
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log(`✅ Staff role set for guild ${guildId}: ${roleId}`);

        return true;
    }

    /**
     * Remove the staff role for a guild
     */
    removeStaffRole(guildId) {
        const configPath = this.getConfigPath(guildId);

        if (!fs.existsSync(configPath)) {
            return false;
        }

        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            delete config.staffRoleId;
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            console.log(`✅ Staff role removed for guild ${guildId}`);
            return true;
        } catch (error) {
            console.error(`Error removing staff role for guild ${guildId}:`, error);
            return false;
        }
    }

    /**
     * Check if a member has staff permissions
     * Returns true if:
     * - Member has Administrator permission
     * - Member has the configured staff role
     * - No staff role is configured (fallback to ManageMessages permission)
     */
    hasStaffPermission(member) {
        if (!member || !member.guild) {
            return false;
        }

        // Administrators always have access
        if (member.permissions.has('Administrator')) {
            return true;
        }

        // Check for configured staff role
        const staffRoleId = this.getStaffRoleId(member.guild.id);

        if (staffRoleId) {
            // Staff role is configured - check if member has it
            const hasRole = member.roles.cache.has(staffRoleId);
            if (hasRole) {
                console.log(`✅ User ${member.user.tag} has staff role in guild ${member.guild.id}`);
            }
            return hasRole;
        } else {
            // No staff role configured - fallback to ManageMessages
            const hasManageMessages = member.permissions.has('ManageMessages');
            if (hasManageMessages) {
                console.log(`✅ User ${member.user.tag} has ManageMessages (no staff role configured)`);
            }
            return hasManageMessages;
        }
    }

    /**
     * Check if a member can configure staff settings (Administrator only)
     */
    canConfigureStaff(member) {
        if (!member || !member.permissions) {
            return false;
        }
        return member.permissions.has('Administrator');
    }

    /**
     * Get config file path for a guild
     */
    getConfigPath(guildId) {
        const guildFolder = path.join(__dirname, '..', 'servers', this.bot.getGuildFolderName(guildId));
        return path.join(guildFolder, 'config.json');
    }

    /**
     * Get staff role object for a guild
     */
    getStaffRole(guild) {
        const staffRoleId = this.getStaffRoleId(guild.id);
        if (!staffRoleId) {
            return null;
        }

        return guild.roles.cache.get(staffRoleId);
    }

    /**
     * Get info about staff configuration for a guild
     */
    getStaffInfo(guild) {
        const staffRoleId = this.getStaffRoleId(guild.id);

        if (!staffRoleId) {
            return {
                configured: false,
                message: 'No staff role configured. Using default permissions (ManageMessages or Administrator).'
            };
        }

        const role = guild.roles.cache.get(staffRoleId);

        if (!role) {
            return {
                configured: true,
                invalid: true,
                roleId: staffRoleId,
                message: `⚠️ Configured staff role (${staffRoleId}) not found. It may have been deleted.`
            };
        }

        return {
            configured: true,
            valid: true,
            role: role,
            roleId: staffRoleId,
            roleName: role.name,
            memberCount: role.members.size,
            message: `Staff role: @${role.name} (${role.members.size} members)`
        };
    }
}

module.exports = StaffRoleManager;
