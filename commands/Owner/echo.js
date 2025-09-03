const echoCommand = {
  name: "echo",
  aliases: ["say", "repeat"],
  description: "Make the bot say something",
  usage: "!echo <message>",
  cooldown: 3000,

  run: async ({ Javix, jid, messages, args, senderName }) => {
    if (!args.length) {
      return await Javix.sendMessage(jid, { text: "*Please provide a message to echo!*\nUsage: !echo <message>" }, { quoted: messages });
    }

    try {
      const message = args.join(" ");
      const echoMessage = `📢 *${senderName} says:*\n\n${message}`;
      await Javix.sendMessage(jid, { text: echoMessage }, { quoted: messages });
    } catch (error) {
      console.error("Echo error:", error);
      await Javix.sendMessage(jid, { text: "*Failed to send echo message!*" }, { quoted: messages });
    }
  },
};

export default echoCommand;
