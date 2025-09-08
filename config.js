import dotenv from "dotenv";
dotenv.config();

const config = {
  mongoUrl: process.env.MONGODB_URI || "",
  mongoOptions: {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    dbName: "Javix",
  },

  sessionId: process.env.SESSION_ID || "",
  botName: process.env.BOT_NAME || "Javix",
  botImage: process.env.BOT_IMAGES || "https://i.ibb.co/GfM38g8g/windbreaker-img.jpg",
  ownerNumber: process.env.OWNER_NUMBERS ? process.env.OWNER_NUMBERS.split(",") : ["923127067592"],
  ownerName: process.env.OWNER_NAME || "Usman",
  prefix: process.env.PREFIX || ".",
  caption: process.env.CAPTION || "*_Downloaded By Javix_*",

  autoReaction: process.env.AUTO_REACTION || false,

  auth: "qr",
  PORT: process.env.PORT || 3000,

  nex_api: "https://api.nexoracle.com",
  nex_key: process.env.NEX_API_KEY || "free_key@maher_apis",

  apiBaseUrl: process.env.API_BASE_URL || "https://aeonsan.xyz/api",

  ownerGithubUrl: "https://github.com/usmanali564",
  githubUrl: "https://github.com/usmanali564/javix",
  waChannel: "https://whatsapp.com/channel/0029VbBSg07D8SDqk3Ha3A0U",

  defaultCooldown: 2000,
  allowSelfCommand: true,
  cooldownBypassForOwner: true,
};

export default config;
