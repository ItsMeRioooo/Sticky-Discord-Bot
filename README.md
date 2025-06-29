# 📌 Sticky Discord Bot

A Discord bot that creates and manages sticky messages with advanced features like custom embeds, variables, and automatic cleanup functionality.

![image](https://github.com/user-attachments/assets/b1b8eb72-0ccf-4400-aeb3-db65c0f0e61e)

## ✨ Features

### 🎯 Core Features
- **Sticky Messages**: Messages that automatically reappear at the bottom of channels when new messages are sent
- **Automatic Cleanup**: Intelligent detection and removal of duplicate sticky messages on bot restart
- **Debounced Sending**: Smart delays to prevent spam and rate limiting
- **Persistent Storage**: Sticky messages persist through bot restarts

### 🎨 Customization Options
- **Embed Support**: Choose between beautiful embeds or plain text messages
- **Custom Footers**: Add personalized footers with dynamic variables
- **Color Customization**: Support for both color names and hex codes
- **Discord Formatting**: Full support for Discord markdown and mentions

### 📝 Dynamic Variables
- `{server_name}` - Server name
- `{time}` - Current time
- `{date}` - Current date  
- `{datetime}` - Date and time
- `{channel_name}` - Channel name
- `{member_count}` - Server member count

### 🎨 Supported Colors
- **Color Names**: Red, Blue, Green, Yellow, Orange, Purple, Pink, Cyan, Magenta, Discord, Blurple, and more
- **Hex Codes**: Any valid hex color code (e.g., #FF0000, #00FF00)

### 🔒 Permission System
- Requires "Manage Messages" permission for all commands
- Administrator permission required for force cleanup
- All responses are ephemeral (only visible to command user)

## 🚀 Commands

### `/sticky-set`
Set a sticky message in a channel
- `content` - The message content (supports Discord formatting & variables) **(Required)**
- `channel` - Target channel (defaults to current channel)
- `embed` - Display as embed (true/false, default: true)
- `footer` - Custom footer text (supports variables)
- `color` - Embed color (color name or hex code)

### `/sticky-remove`
Remove a sticky message from a channel
- `channel` - Target channel (defaults to current channel)

### `/sticky-list`
List all sticky messages in the server

### `/sticky-help`
Show detailed help information

### `/sticky-force-cleanup`
Force cleanup ALL bot messages in a channel (Admin only)
- `channel` - Target channel (defaults to current channel)

## 🛠️ Installation

### Prerequisites
- Node.js 16.0.0 or higher
- A Discord bot token
- A Discord server with appropriate permissions

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/ItsMeRioooo/Sticky-Discord-Bot.git
   cd Sticky-Discord-Bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   ```

4. **Configure your bot token**
   Edit `.env` and add your Discord bot token:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   ```

5. **Invite the bot to your server**
   - Go to Discord Developer Portal
   - Select your application
   - Go to OAuth2 > URL Generator
   - Select `bot` and `applications.commands` scopes
   - Select required permissions: `Send Messages`, `Manage Messages`, `Use Slash Commands`
   - Use the generated URL to invite the bot

6. **Start the bot**
   ```bash
   npm start
   ```

## 📁 Project Structure

```
sticky-discord-bot/
├── index.js           # Main bot file
├── package.json       # Node.js dependencies and scripts
├── .env              # Environment variables (create from .env.example)
├── .env.example      # Environment template
├── .gitignore        # Git ignore file
├── README.md         # Project documentation
├── sticky-data.json  # Persistent storage (auto-generated)
└── config.json       # Bot configuration (optional)
```

## 🔧 Configuration

The bot uses JSON files for persistent storage:
- `sticky-data.json` - Stores all sticky message configurations
- `config.json` - Additional bot settings (optional)

## 🎯 Usage Examples

### Basic Sticky Message
```
/sticky-set content:Welcome to our server! Please read the rules.
```

### Advanced Embed with Variables
```
/sticky-set content:Welcome to {server_name}! We have {member_count} members. embed:true footer:Updated at {time} color:blurple
```

### Plain Text with Custom Footer
```
/sticky-set content:📢 Important announcement embed:false footer:📌 Server update • {date}
```

## 🛡️ Error Handling

The bot includes comprehensive error handling:
- Automatic retry on rate limits
- Graceful handling of missing permissions
- Cleanup of orphaned sticky messages
- Detailed logging for troubleshooting

## 🔄 Auto-Cleanup Features

- **Startup Cleanup**: Automatically removes duplicate sticky messages on bot restart
- **Smart Detection**: Identifies sticky messages by content, footers, and stored IDs
- **Force Cleanup**: Manual command to remove all bot messages in a channel
- **Duplicate Prevention**: Prevents multiple sticky messages in the same channel

## 📊 Performance Features

- **Debounced Sending**: Prevents spam by delaying message sends
- **Rate Limit Handling**: Built-in delays to respect Discord API limits
- **Efficient Message Fetching**: Optimized message retrieval and cleanup
- **Memory Management**: Proper cleanup of timeouts and processing flags

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👤 Author

**ItsMeRioooo**
- GitHub: [@ItsMeRioooo](https://github.com/ItsMeRioooo)
- Repository: [Sticky-Discord-Bot](https://github.com/ItsMeRioooo/Sticky-Discord-Bot)

## 🐛 Bug Reports & Feature Requests

If you encounter any issues or have suggestions for new features, please:
1. Check existing [issues](https://github.com/ItsMeRioooo/Sticky-Discord-Bot/issues)
2. Create a new issue with detailed information
3. Include steps to reproduce for bug reports

## ⭐ Support

If you find this project helpful, please consider giving it a star!

## 🔗 Links

- [Discord Developer Portal](https://discord.com/developers/applications)
- [Discord.js Documentation](https://discord.js.org/)
- [Node.js Download](https://nodejs.org/)
