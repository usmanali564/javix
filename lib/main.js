import config from "#config";
import { makeWASocket, DisconnectReason, fetchLatestBaileysVersion } from "baileys";
import pino from "pino";
import readline from "readline";
import chalk from "chalk";
import NodeCache from "node-cache";
import qrcode from "qrcode-terminal";
import { logger } from "logyo";
import handleMessage, { reloadCommands } from "./handler.js";
import { useMongoAuthState } from "../Auth/mongoAuthState.js";
import { startWebServer } from "./functions/server.js";
import { initializeStatusMode } from "../commands/Owner/botProfile.js";
import { formatUptime, startStatusUpdater, getCurrentStatus } from "./functions/status.js";
import { startBirthdayScheduler } from "./functions/birthdayScheduler.js";
import Session from "../models/Session.model.js";

const msgRetryCounterCache = new NodeCache();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => (rl.closed ? resolve("") : rl.question(text, resolve)));

let store = null;
let phoneNumber = null;
let countryCode = null;

const DISCONNECT_REASONS = {
  [DisconnectReason.connectionClosed]: "Connection closed",
  [DisconnectReason.connectionLost]: "Connection lost",
  [DisconnectReason.restartRequired]: "Restart required",
  [DisconnectReason.timedOut]: "Connection timed out",
  [DisconnectReason.badSession]: "Bad session",
  [DisconnectReason.connectionReplaced]: "Connection replaced",
  [DisconnectReason.loggedOut]: "Logged out",
  515: "Connection closed by server",
};

let qrCodeToSend = null;
let sessionVerified = false;
let webServerStarted = false;

export async function initJavix() {
  try {
    console.log(chalk.cyan("=========================="));
    console.log(chalk.cyan("🤖 Bot Startup Initiated"));
    console.log(chalk.cyan(`📱 Bot Name: ${config.botName}`));
    console.log(chalk.cyan(`🔑 Auth Method: ${config.auth}`));
    console.log(chalk.cyan(`🆔 Session ID: ${config.sessionId}`));
    console.log(chalk.cyan("=========================="));

    if (!config.auth) {
      console.log(chalk.red("Invalid auth method in config.js!"));
      process.exit(1);
    }

    const useQR = config.auth.toLowerCase() === "qr";
    if (!useQR) {
      console.log(chalk.red("Invalid auth method in config! Only 'qr' is supported now."));
      process.exit(1);
    }

    console.log(chalk.cyan("📡 Connecting to MongoDB..."));
    const { state, saveCreds } = await useMongoAuthState(config.sessionId);
    console.log(chalk.green("✅ MongoDB Connected Successfully"));

    await initializeStatusMode();

    const sessionExists = state.creds && Object.keys(state.creds).length > 0;
    const sessionValid = !!(sessionExists && state.creds.me && state.creds.me.id);

    // console.log(chalk.blue(`Session ID: ${config.sessionId}`));
    // console.log(chalk.blue(`Session Exists: ${sessionExists}`));
    // console.log(chalk.blue(`Session Valid: ${sessionValid || false}`));

    let needsAuth = !sessionValid;
    let webServer = null;
    let io = null;

    if (needsAuth) {
      webServer = startWebServer();
      while (!webServer.sessionVerified) {
        console.log("Waiting for session verification via web page...");
        await new Promise((r) => setTimeout(r, 2500));
      }
    } else if (sessionValid) {
      // console.log(chalk.green("Valid session found! Using existing session..."));
      webServer = startWebServer();
    }

    if (!rl.closed) rl.close();

    const { version, isLatest } = await fetchLatestBaileysVersion();
    // console.log(`Using WhatsApp v${version.join(".")}, isLatest: ${isLatest}`);

    const Javix = makeWASocket({
      version,
      logger: pino({ level: "silent" }),
      auth: { creds: state.creds, keys: state.keys },
      msgRetryCounterCache,
    });

    Javix.ev.on("creds.update", async () => {
      await saveCreds();
    });

    Javix.ev.on("messages.upsert", async (m) => {
      const message = m.messages[0];
      if (!message || !message.message) return;

      const isSelf = message.key.fromMe === true;

      process.nextTick(async () => {
        try {
          await handleMessage(Javix, message, isSelf);
        } catch (err) {
          console.error(chalk.red("Error in handler:"), err);
        }
      });
    });

    let pairingCodeGenerated = false;

    Javix.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
      if (qr && useQR && needsAuth) {
        if (webServer) webServer.setQR(qr);
        console.log(chalk.green("Scan this QR code in WhatsApp (Terminal):"));
        qrcode.generate(qr, { small: true });
      }

      if (connection === "open") {
        const userName = Javix.user?.name || config.botName;
        const ownNumber = Javix.user?.id?.split(":")[0] || "unknown";

        console.log(chalk.green("=========================="));
        console.log(chalk.green("✅ Bot Connected Successfully"));
        console.log(chalk.cyan("• User Info"));
        console.log(chalk.cyan(`- Name: ${userName}`));
        console.log(chalk.cyan(`- Number: ${ownNumber}`));
        console.log(chalk.cyan(`- Status: Connected`));
        console.log(chalk.green(`- Session: ${sessionValid ? "Existing" : "New"}`));
        console.log(chalk.green("=========================="));

        if (webServer) {
          webServer.sessionVerified = true;
          webServer.connected = true;
        }

        try {
          if (!global.startTime) {
            global.startTime = Date.now();
          }
          const statusMode = global.statusMode || "uptime";
          const uptime = Date.now() - global.startTime;
          const uptimeStr = formatUptime(uptime);
          const currentStatus = getCurrentStatus();

          let ownerJids = [];
          if (Array.isArray(config.ownerNumber)) {
            ownerJids = config.ownerNumber.map((num) => num.replace(/[^0-9]/g, "") + "@s.whatsapp.net");
          } else if (typeof config.ownerNumber === "string") {
            ownerJids = [config.ownerNumber.replace(/[^0-9]/g, "") + "@s.whatsapp.net"];
          }

          const { commands } = await reloadCommands();
          const totalCommands = commands.size;

          const isDevelopment = process.env.NODE_ENV === "development";
          const isProduction = process.env.NODE_ENV === "production" || !process.env.NODE_ENV;

          if (ownerJids.length > 0) {
            if (isDevelopment) {
              const firstOwnerJid = ownerJids[0];
              if (firstOwnerJid) {
                await Javix.sendMessage(firstOwnerJid, {
                  text: `*_${config.botName} Bot Connected_*\n\n_*Prefix:* [ ${config.prefix} ]_\n_*Commands:* ${totalCommands}_\n_*Owner:* ${config.ownerName}_\n_*Number:* ${ownNumber.toString()}_\n\n *_Join our Channel_*\n_${config.waChannel}_`,
                });
              }
            } else if (isProduction) {
              for (const ownerJid of ownerJids) {
                if (ownerJid) {
                  await Javix.sendMessage(ownerJid, {
                    text: `*_${config.botName} Bot Connected_*\n\n_*Prefix:* [ ${config.prefix} ]_\n_*Commands:* ${totalCommands}_\n_*Owner:* ${config.ownerName}_\n_*Number:* ${ownNumber.toString()}_\n\n *_Join our Channel_*\n_${config.waChannel}_`,
                  });
                }
              }
            }
          }
        } catch (err) {
          console.error("Failed to send about message to owner:", err);
        }
        startStatusUpdater(Javix);
        startBirthdayScheduler(Javix);
      } else if (connection === "close") {
        const reason = lastDisconnect?.error?.output?.statusCode || 0;
        const retryReasons = [DisconnectReason.connectionClosed, DisconnectReason.connectionLost, DisconnectReason.restartRequired, DisconnectReason.timedOut, 515];

        if (reason === DisconnectReason.badSession) {
          console.log(chalk.red("Session corrupted, please restart the bot!"));
          process.exit(1);
        } else if (reason === DisconnectReason.connectionReplaced) {
          console.log(chalk.red("New session opened elsewhere. Close it first!"));
          process.exit(1);
        } else if (reason === DisconnectReason.loggedOut) {
          const deleted = await Session.deleteOne({ sessionId: config.sessionId });
          if (deleted.deletedCount > 0) {
            console.log(chalk.yellow(`Session record for ${config.sessionId} deleted due to logout.`));
          }

          console.log(chalk.red("Device logged out. Please restart the bot to re-authenticate!"));
          process.exit(1);
        } else if (retryReasons.includes(reason)) {
          console.log(chalk.yellow(`Connection closed, retrying in 5 seconds...`));
          setTimeout(() => initJavix(), 5000);
          return;
        } else {
          console.log(chalk.red(`Unknown disconnect reason: ${reason}`));
        }

        const disconnectReason = DISCONNECT_REASONS[reason] || "Unknown reason";

        console.log(chalk.red("=========================="));
        console.log(chalk.red("Bot Disconnected"));
        console.log(chalk.red(`Reason: ${disconnectReason}`));
        console.log(chalk.red(`Status Code: ${reason}`));
        console.log(chalk.red("=========================="));

        process.exit(1);
      }
    });

    Javix.ev.on("groups.update", async (updates) => {
      try {
        if (!updates || !Array.isArray(updates) || updates.length === 0) {
          return;
        }

        const update = updates[0];
        if (!update.id) return;
        let groupPp;
        try {
          groupPp = await Javix.profilePictureUrl(update.id, "image");
        } catch {
          groupPp = "https://images2.alphacoders.com/882/882819.jpg";
        }

        const wm = { url: groupPp };
        if (update.announce !== undefined) {
          const message = update.announce ? "Group has been *Closed!* Only *Admins* can send Messages!" : "Group has been *Opened!* Now *Everyone* can send Messages!";

          await Javix.sendMessage(update.id, {
            image: wm,
            caption: message,
          });
        } else if (update.restrict !== undefined) {
          const message = update.restrict ? "Group Info modification has been *Restricted*, Now only *Admins* can edit Group Info!" : "Group Info modification has been *Un-Restricted*, Now *Everyone* can edit Group Info!";

          await Javix.sendMessage(update.id, {
            image: wm,
            caption: message,
          });
        } else if (update.subject) {
          const message = `Group Subject has been updated To:\n\n*${update.subject}*`;
          await Javix.sendMessage(update.id, {
            image: wm,
            caption: message,
          });
        }
      } catch (error) {
        logger.logError(error, { context: "Group Update Handler" });
        console.error(chalk.red("Error in group update:"), error);
      }
    });
  } catch (error) {
    console.log(chalk.red("=========================="));
    console.log(chalk.red("Error Starting Bot"));
    console.log(chalk.red(`Error: ${error.message}`));
    console.log(chalk.red("=========================="));
    process.exit(1);
  }
}

export default initJavix;
