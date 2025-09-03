# <p align="center">Javix</p>

<p align="center"> 
  <strong>A modern, feature-rich WhatsApp bot</strong> with advanced features, role management, and AI integration
</p>

## ✨ Features

- 🤖 **WhatsApp Integration** - Built with Baileys
- 👥 **Role Management** - Add/remove moderators and admins
- 🚫 **Ban System** - Comprehensive user banning with expiration
- 🔧 **Access Control** - Public/private/restricted modes
- 🤖 **AI Commands** - GPT integration and AI features
- 🎨 **Media Processing** - Image generation and video editing
- 📊 **Statistics** - Command usage and performance tracking
- 🎮 **Fun & Games** - Entertainment commands

## 🚀 Deploy

[![Deploy on Heroku](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy?template=https://github.com/usmanali564/javix)

## ⚡ Setup

### Prerequisites

- Node.js 20+
- MongoDB database
- WhatsApp account
- Git

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/usmanali564/Javix.git
   cd Javix
   ```

2. **Install dependencies**

   ```bash
   npm install
   npm install -g pm2
   ```

3. **Configure environment**

   ```bash
   # Edit .env with your configuration
   # Set a unique characters/crypto as your SESSION_ID
   ```

4. **Start the bot**
   ```bash
   npm start
   ```

## 🔐 Authentication

### Web-Based QR Login

1. Start the bot without an existing session
2. Open `http://localhost:3000/session` or your domain (if hosted on any platform) in your browser
3. Enter your `SESSION_ID`
4. Scan the QR code with WhatsApp
5. The bot will connect automatically

### Session Management

- Sessions are stored in MongoDB
- Use a unique `SESSION_ID` in your `.env` file
- Keep your session ID private and secure

## ⚠️ Important Notice

> **Warning**: This bot is not affiliated with WhatsApp Inc. Misuse may result in account bans. Use at your own risk.

## 🤝 Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch (`feature/your-feature`)
3. Make your changes
4. Test thoroughly
5. Submit a pull request

For bug reports and feature requests, please create an issue on GitHub.

## 📄 License

MIT License - see [LICENSE](https://github.com/usmanali564/javix/blob/main/license) for details

## 🙏 Credits

- [Baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web Library
- [Maher Zubair](https://github.com/maherxubair) - Main Developer

## 💬 Support

For help and support:

- Create an issue on GitHub
- Check the documentation
- Join community discussions

---

<p align="center">
  <strong> Enjoy using Javix! 🚀 </Strong>
</p>
