/**
 * MIT License
 * 
 * Copyright (c) 2025 ItsMeRiooooPH
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const { Client, GatewayIntentBits, PermissionFlagsBits, SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class StickyBot {
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ]
        });

        this.stickyMessages = new Map();
        this.stickyTimeouts = new Map();
        this.processingChannels = new Set();
        this.loadStickyMessages();
        this.setupEventHandlers();
    }

    loadStickyMessages() {
        try {
            const dataPath = path.join(__dirname, 'sticky-data.json');
            if (fs.existsSync(dataPath)) {
                const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
                this.stickyMessages = new Map(Object.entries(data));
                console.log(`Loaded ${this.stickyMessages.size} sticky messages`);
            }
        } catch (error) {
            console.error('Error loading sticky messages:', error);
        }
    }

    saveStickyMessages() {
        try {
            const dataPath = path.join(__dirname, 'sticky-data.json');
            const data = Object.fromEntries(this.stickyMessages);
            fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Error saving sticky messages:', error);
        }
    }

    setupEventHandlers() {
        this.client.once('ready', async () => {
            console.log(`✅ ${this.client.user.tag} is online!`);
            this.client.user.setActivity('Sticky Messages', { type: 'WATCHING' });
            
            await this.registerCommands();
            
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            await this.cleanupDuplicateStickies();
            
            await new Promise(resolve => setTimeout(resolve, 3000));
            await this.refreshAllStickyMessages();
        });

        this.client.on('messageCreate', async (message) => {
            if (message.author.bot) return;
            
            const channelId = message.channel.id;
            const stickyData = this.stickyMessages.get(channelId);
            
            if (stickyData && !this.processingChannels.has(channelId)) {
                if (this.stickyTimeouts.has(channelId)) {
                    clearTimeout(this.stickyTimeouts.get(channelId));
                }
                
                const timeout = setTimeout(async () => {
                    if (!this.processingChannels.has(channelId)) {
                        await this.handleStickyMessage(message.channel, stickyData);
                    }
                    this.stickyTimeouts.delete(channelId);
                }, 2000);
                
                this.stickyTimeouts.set(channelId, timeout);
            }
        });

        this.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isChatInputCommand()) return;
            await this.handleSlashCommand(interaction);
        });
    }

    async cleanupDuplicateStickies() {
        console.log('🧹 Starting comprehensive sticky message cleanup...');
        
        for (const [channelId, stickyData] of this.stickyMessages) {
            try {
                const channel = this.client.channels.cache.get(channelId);
                if (!channel) {
                    console.log(`Channel ${channelId} not found, removing from sticky data`);
                    this.stickyMessages.delete(channelId);
                    continue;
                }
                
                console.log(`Cleaning up sticky messages in #${channel.name}...`);
                
                if (stickyData.messageId) {
                    try {
                        const existingMessage = await channel.messages.fetch(stickyData.messageId);
                        if (existingMessage) {
                            await existingMessage.delete();
                            console.log(`Deleted stored sticky message ${stickyData.messageId} in #${channel.name}`);
                        }
                    } catch (error) {
                        console.log(`Stored message ${stickyData.messageId} not found or couldn't be deleted`);
                    }
                }
                
                const messages = await channel.messages.fetch({ limit: 100 });
                const botMessages = messages.filter(msg => msg.author.id === this.client.user.id);
                
                console.log(`Found ${botMessages.size} messages from bot in #${channel.name}, scanning for sticky messages...`);
                
                let deletedCount = 0;
                for (const [, msg] of botMessages) {
                    let isSticky = false;
                    
                    if (msg.embeds.length > 0) {
                        const embed = msg.embeds[0];
                        const footer = embed.footer?.text || '';
                        if (footer.includes('📌') || 
                            footer.toLowerCase().includes('sticky') ||
                            footer.includes('This is a sticky message')) {
                            isSticky = true;
                        }
                    }
                    
                    if (msg.content) {
                        const content = msg.content;
                        if (content.includes('*📌') || 
                            content.includes('📌 This is a sticky message') ||
                            content.toLowerCase().includes('*sticky message*') ||
                            (stickyData.content && content.includes(stickyData.content.substring(0, Math.min(30, stickyData.content.length))))) {
                            isSticky = true;
                        }
                    }
                    
                    if (isSticky) {
                        try {
                            await msg.delete();
                            deletedCount++;
                            console.log(`Deleted sticky message ${msg.id} in #${channel.name}`);
                            await new Promise(resolve => setTimeout(resolve, 150));
                        } catch (error) {
                            console.log(`Could not delete message ${msg.id}: ${error.message}`);
                        }
                    }
                }
                
                console.log(`Deleted ${deletedCount} sticky messages in #${channel.name}`);
                
                stickyData.messageId = null;
                this.stickyMessages.set(channelId, stickyData);
                
            } catch (error) {
                console.error(`Error cleaning up sticky messages in channel ${channelId}:`, error);
            }
        }
        
        this.saveStickyMessages();
        console.log('✅ Comprehensive cleanup complete - all old sticky messages removed');
    }

    async refreshAllStickyMessages() {
        console.log('🔄 Refreshing all sticky messages...');
        
        for (const [channelId, stickyData] of this.stickyMessages) {
            try {
                const channel = this.client.channels.cache.get(channelId);
                if (!channel) continue;
                
                console.log(`Refreshing sticky message in ${channel.name}`);
                await this.handleStickyMessage(channel, stickyData);
                
                // Add delay between channels to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`Error refreshing sticky message in channel ${channelId}:`, error);
            }
        }
        
        console.log('✅ All sticky messages refreshed');
    }

    async handleStickyMessage(channel, stickyData) {
        const channelId = channel.id;
        
        if (this.processingChannels.has(channelId)) {
            console.log(`Already processing sticky message for channel ${channel.name}, skipping...`);
            return;
        }
        
        this.processingChannels.add(channelId);
        
        try {
            if (stickyData.messageId) {
                try {
                    const existingMessage = await channel.messages.fetch(stickyData.messageId);
                    if (existingMessage) {
                        await existingMessage.delete();
                        console.log(`Deleted stored sticky message ${stickyData.messageId} in #${channel.name}`);
                    }
                } catch (error) {
                    console.log(`Stored message ${stickyData.messageId} not found or couldn't be deleted`);
                }
            }
            
            const messages = await channel.messages.fetch({ limit: 50 });
            const botMessages = messages.filter(msg => msg.author.id === this.client.user.id);
            
            let deletedCount = 0;
            for (const [, msg] of botMessages) {
                let isSticky = false;
                
                if (msg.embeds.length > 0) {
                    const embed = msg.embeds[0];
                    const footer = embed.footer?.text || '';
                    if (footer.includes('📌') || 
                        footer.toLowerCase().includes('sticky') ||
                        footer.includes('This is a sticky message')) {
                        isSticky = true;
                    }
                }
                
                if (msg.content) {
                    const content = msg.content;
                    if (content.includes('*📌') || 
                        content.includes('📌 This is a sticky message') ||
                        content.toLowerCase().includes('*sticky message*') ||
                        (stickyData.content && content.includes(stickyData.content.substring(0, Math.min(30, stickyData.content.length))))) {
                        isSticky = true;
                    }
                }
                
                if (isSticky) {
                    try {
                        await msg.delete();
                        deletedCount++;
                        console.log(`Deleted existing sticky message ${msg.id} in #${channel.name}`);
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } catch (error) {
                        console.log(`Could not delete message ${msg.id}: ${error.message}`);
                    }
                }
            }
            
            console.log(`Deleted ${deletedCount} existing sticky messages in #${channel.name}`);

            await new Promise(resolve => setTimeout(resolve, 500));

            const processedContent = this.processMessageContent(stickyData.content, channel);
            const processedFooter = stickyData.customFooter ? 
                this.processMessageContent(stickyData.customFooter, channel) : 
                '📌 This is a sticky message';

            let messageOptions;

            if (stickyData.useEmbed) {
                const embed = new EmbedBuilder()
                    .setColor(stickyData.embedColor || '#FFFF00')
                    .setDescription(processedContent)
                    .setFooter({ text: processedFooter })
                    .setTimestamp();

                messageOptions = { embeds: [embed] };
            } else {
                const footerText = processedFooter !== '📌 This is a sticky message' ? 
                    `\n\n*${processedFooter}*` : 
                    '\n\n*📌 This is a sticky message*';
                
                messageOptions = { content: processedContent + footerText };
            }

            const newMessage = await channel.send(messageOptions);
            
            stickyData.messageId = newMessage.id;
            this.stickyMessages.set(channelId, stickyData);
            this.saveStickyMessages();
            
        } catch (error) {
            console.error('Error handling sticky message:', error);
        } finally {
            this.processingChannels.delete(channelId);
        }
    }

    processMessageContent(content, channel) {
        if (!content) return '';
        
        const now = new Date();
        const guild = channel.guild;
        
        return content
            .replace(/{server_name}/gi, guild.name)
            .replace(/{Server_name}/g, guild.name)
            .replace(/{SERVER_NAME}/g, guild.name)
            .replace(/{time}/gi, now.toLocaleTimeString())
            .replace(/{date}/gi, now.toLocaleDateString())
            .replace(/{datetime}/gi, now.toLocaleString())
            .replace(/{channel_name}/gi, channel.name)
            .replace(/{Channel_name}/g, channel.name)
            .replace(/{CHANNEL_NAME}/g, channel.name)
            .replace(/{member_count}/gi, guild.memberCount.toString())
            .replace(/{Member_count}/g, guild.memberCount.toString())
            .replace(/{MEMBER_COUNT}/g, guild.memberCount.toString());
    }

    processColor(colorInput) {
        if (!colorInput) return '#FFFF00';
        
        const colorMap = {
            'red': '#FF0000',
            'blue': '#0000FF',
            'green': '#00FF00',
            'yellow': '#FFFF00',
            'orange': '#FFA500',
            'purple': '#800080',
            'pink': '#FFC0CB',
            'cyan': '#00FFFF',
            'magenta': '#FF00FF',
            'lime': '#00FF00',
            'navy': '#000080',
            'teal': '#008080',
            'silver': '#C0C0C0',
            'gray': '#808080',
            'grey': '#808080',
            'maroon': '#800000',
            'olive': '#808000',
            'aqua': '#00FFFF',
            'fuchsia': '#FF00FF',
            'white': '#FFFFFF',
            'black': '#000000',
            'gold': '#FFD700',
            'discord': '#7289DA',
            'blurple': '#5865F2'
        };
        
        const input = colorInput.toLowerCase().trim();
        
        if (colorMap[input]) {
            return colorMap[input];
        }
        
        if (/^#([0-9A-F]{3}){1,2}$/i.test(colorInput)) {
            return colorInput.toUpperCase();
        }
        
        if (/^([0-9A-F]{3}){1,2}$/i.test(colorInput)) {
            return '#' + colorInput.toUpperCase();
        }
        
        return '#FFFF00';
    }

    async handleSlashCommand(interaction) {
        const { commandName } = interaction;

        try {
            switch (commandName) {
                case 'sticky-set':
                    await this.setSticky(interaction);
                    break;
                case 'sticky-remove':
                    await this.removeSticky(interaction);
                    break;
                case 'sticky-list':
                    await this.listSticky(interaction);
                    break;
                case 'sticky-help':
                    await this.showHelp(interaction);
                    break;
                case 'sticky-force-cleanup':
                    await this.forceCleanup(interaction);
                    break;
            }
        } catch (error) {
            console.error('Error handling slash command:', error);
            
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: '❌ An error occurred while processing the command.',
                        flags: MessageFlags.Ephemeral
                    });
                } else if (interaction.deferred) {
                    await interaction.editReply({
                        content: '❌ An error occurred while processing the command.'
                    });
                }
            } catch (replyError) {
                console.error('Failed to send error response:', replyError);
            }
        }
    }

    async setSticky(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return await interaction.reply({
                content: '❌ You need the "Manage Messages" permission to use this command.',
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const content = interaction.options.getString('content');
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        const useEmbed = interaction.options.getBoolean('embed') ?? true;
        const customFooter = interaction.options.getString('footer') || null;
        const embedColor = this.processColor(interaction.options.getString('color'));

        const stickyData = {
            content: content,
            channelId: channel.id,
            authorId: interaction.user.id,
            createdAt: new Date().toISOString(),
            messageId: null,
            useEmbed: useEmbed,
            customFooter: customFooter,
            embedColor: embedColor
        };

        this.stickyMessages.set(channel.id, stickyData);
        this.saveStickyMessages();

        try {
            await this.handleStickyMessage(channel, stickyData);

            await interaction.editReply({
                content: `✅ Sticky message set in ${channel}!`
            });
        } catch (error) {
            console.error('Error setting sticky message:', error);
            await interaction.editReply({
                content: '❌ Failed to set sticky message. Please try again.'
            });
        }
    }

    async removeSticky(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return await interaction.reply({
                content: '❌ You need the "Manage Messages" permission to use this command.',
                flags: MessageFlags.Ephemeral
            });
        }

        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const stickyData = this.stickyMessages.get(channel.id);

        if (!stickyData) {
            return await interaction.reply({
                content: `❌ No sticky message found in ${channel}.`,
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            if (stickyData.messageId) {
                try {
                    const message = await channel.messages.fetch(stickyData.messageId);
                    await message.delete();
                } catch (error) {
                    
                }
            }

            if (this.stickyTimeouts.has(channel.id)) {
                clearTimeout(this.stickyTimeouts.get(channel.id));
                this.stickyTimeouts.delete(channel.id);
            }

            this.processingChannels.delete(channel.id);

            this.stickyMessages.delete(channel.id);
            this.saveStickyMessages();

            await interaction.editReply({
                content: `✅ Sticky message removed from ${channel}!`
            });
        } catch (error) {
            console.error('Error removing sticky message:', error);
            await interaction.editReply({
                content: '❌ Failed to remove sticky message. Please try again.'
            });
        }
    }

    async listSticky(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return await interaction.reply({
                content: '❌ You need the "Manage Messages" permission to use this command.',
                flags: MessageFlags.Ephemeral
            });
        }

        const guildStickies = Array.from(this.stickyMessages.entries())
            .filter(([channelId]) => {
                const channel = this.client.channels.cache.get(channelId);
                return channel && channel.guild.id === interaction.guild.id;
            });

        if (guildStickies.length === 0) {
            return await interaction.reply({
                content: '📋 No sticky messages found in this server.',
                flags: MessageFlags.Ephemeral
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#00D4FF')
            .setTitle('📌 Sticky Messages in this Server')
            .setTimestamp();

        let description = '';
        for (const [channelId, data] of guildStickies) {
            const channel = this.client.channels.cache.get(channelId);
            if (channel) {
                const preview = data.content.length > 50 
                    ? data.content.substring(0, 50) + '...' 
                    : data.content;
                const type = data.useEmbed ? '📋 Embed' : '💬 Text';
                const footer = data.customFooter ? ' (Custom footer)' : '';
                const color = data.embedColor && data.embedColor !== '#FFFF00' ? ` (${data.embedColor})` : '';
                description += `**${channel.name}** ${type}${footer}${color}: ${preview}\n`;
            }
        }

        embed.setDescription(description);

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    async showHelp(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return await interaction.reply({
                content: '❌ You need the "Manage Messages" permission to use this command.',
                flags: MessageFlags.Ephemeral
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#7289DA')
            .setTitle('📌 Sticky Bot Help')
            .setDescription('A bot that creates sticky messages that reappear at the bottom of a channel when new messages are sent.')
            .addFields(
                {
                    name: '/sticky-set',
                    value: 'Set a sticky message in a channel\n' +
                           '`content`: The message content (supports Discord formatting)\n' +
                           '`channel`: Target channel (optional)\n' +
                           '`embed`: Display as embed (true/false, default: true)\n' +
                           '`footer`: Custom footer text (optional)\n' +
                           '`color`: Embed color (optional, default: yellow)',
                    inline: false
                },
                {
                    name: '📝 Supported Variables',
                    value: '`{server_name}` - Server name\n' +
                           '`{time}` - Current time\n' +
                           '`{date}` - Current date\n' +
                           '`{datetime}` - Date and time\n' +
                           '`{channel_name}` - Channel name\n' +
                           '`{member_count}` - Server member count',
                    inline: false
                },
                {
                    name: '🎨 Color Options',
                    value: 'Color names: `Red`, `Blue`, `Green`, `Purple`, `Orange`, `Pink`, `Discord`, `Blurple`\n' +
                           'Hex codes: `#FF0000`, `#00FF00`, `#0000FF`\n' +
                           'Default: `Yellow` (#FFFF00)',
                    inline: false
                },
                {
                    name: '🎨 Discord Formatting',
                    value: '**Bold**, *Italic*, ~~Strikethrough~~\n' +
                           '`Code`, ```Code Block```\n' +
                           '> Quote, >>> Multi-line quote\n' +
                           '<@&roleID> for role mentions\n' +
                           '<#channelID> for channel mentions',
                    inline: false
                },
                {
                    name: '/sticky-remove',
                    value: 'Remove a sticky message from a channel\n`channel`: Target channel (optional)',
                    inline: false
                },
                {
                    name: '/sticky-list',
                    value: 'List all sticky messages in the server',
                    inline: false
                },
                {
                    name: '/sticky-help',
                    value: 'Show this help message',
                    inline: false
                },
                {
                    name: '/sticky-force-cleanup',
                    value: 'Force cleanup ALL bot messages in a channel (Admin only)',
                    inline: false
                }
            )
            .setFooter({ text: 'Note: You need "Manage Messages" permission to use this bot' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    async registerCommands() {
        const commands = [
            new SlashCommandBuilder()
                .setName('sticky-set')
                .setDescription('Set a sticky message in a channel')
                .addStringOption(option =>
                    option.setName('content')
                        .setDescription('The sticky message content (supports formatting & variables)')
                        .setRequired(true)
                )
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to set the sticky message in (defaults to current channel)')
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option.setName('embed')
                        .setDescription('Display as embed (true) or regular message (false) - default: true')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option.setName('footer')
                        .setDescription('Custom footer text (supports variables)')
                        .setRequired(false)
                )
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('Embed color (hex code like #FF0000, or color name like Red, Blue, Green)')
                        .setRequired(false)
                ),
            
            new SlashCommandBuilder()
                .setName('sticky-remove')
                .setDescription('Remove a sticky message from a channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to remove the sticky message from (defaults to current channel)')
                        .setRequired(false)
                ),
            
            new SlashCommandBuilder()
                .setName('sticky-list')
                .setDescription('List all sticky messages in this server'),
            
            new SlashCommandBuilder()
                .setName('sticky-help')
                .setDescription('Show help information for the sticky bot'),
            
            new SlashCommandBuilder()
                .setName('sticky-force-cleanup')
                .setDescription('Force cleanup ALL bot messages in a channel (admin only)')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to clean up (defaults to current channel)')
                        .setRequired(false)
                )
        ];

        try {
            console.log('🔄 Refreshing application (/) commands...');
            await this.client.application.commands.set(commands);
            console.log('✅ Successfully reloaded application (/) commands.');
        } catch (error) {
            console.error('❌ Error refreshing commands:', error);
        }
    }

    start() {
        this.client.login(process.env.DISCORD_TOKEN);
    }
}

const bot = new StickyBot();
bot.start();

process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down bot...');
    bot.client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down bot...');
    bot.client.destroy();
    process.exit(0);
});
