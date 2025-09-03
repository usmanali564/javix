import util from "util";
import config from "#config";
import fetch from "node-fetch";

const evalCommand = {
  name: "eval",
  description: "Run JavaScript code dynamically (owner only).",
  ownerOnly: true,

  run: async ({ Javix, message, senderNumber, args, from, isOwner, isSelf }) => {
    // Allow both owner and self messages
    if (!isOwner && !isSelf) {
      return await Javix.sendMessage(from, { text: "⛔ Access denied. Owner only." }, { quoted: message });
    }

    if (!args.length) {
      return await Javix.sendMessage(from, { text: "❗ Usage: !eval <JavaScript code>" }, { quoted: message });
    }

    const code = args.join(" ");

    // Custom helper to send messages easily
    const sendMessage = async (jid, content, options = {}) => {
      try {
        if (!jid.endsWith("@s.whatsapp.net") && !jid.endsWith("@g.us")) {
          jid = jid.includes("-") ? `${jid}@g.us` : `${jid}@s.whatsapp.net`;
        }
        return await Javix.sendMessage(jid, content, options);
      } catch (err) {
        return await Javix.sendMessage(from, { text: `sendMessage error: ${err.message}` }, { quoted: message });
      }
    };

    const log = async (...args) => {
      const text = args.map((a) => (typeof a === "string" ? a : util.inspect(a, { depth: 1 }))).join(" \n");
      await sendMessage(from, { text });
    };

    try {
      const result = await eval(`(async () => {
        const fetchJson = async (url, options = {}) => {
          const res = await fetch(url, options);
          return res.json();
        };

        ${code}
      })()`);

      if (result !== undefined) {
        const output = typeof result === "string" ? result : util.inspect(result, { depth: 1 });
        await sendMessage(from, { text: output });
      }
    } catch (error) {
      const errorMsg = `Error: ${error.name} - ${error.message}\n\nStack:\n${error.stack}`;
      await Javix.sendMessage(from, { text: errorMsg }, { quoted: message });
    }
  },
};

export default evalCommand;
