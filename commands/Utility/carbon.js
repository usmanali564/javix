import fetch from "node-fetch";

const carbonCommand = {
  name: "carbon",
  aliases: ["codeimage"],
  description: "Convert code to carbon image",
  usage: "!carbon <code> or reply to a code message",
  cooldown: 10,

  run: async ({ Javix, messages, reply, botName, args, jid }) => {
    let code;

    if (messages.quoted && messages.quoted.text) {
      code = messages.quoted.text;
    } else if (args.length > 0) {
      code = args.join(" ").replace(/\\n/g, "\n").replace(/\\t/g, "\t");
    } else {
      return reply('*Please provide code or reply to a code message!*\n\nExample:\n```js\nconst hello = "world";\nconsole.log(hello);\n```');
    }

    try {
      const caption = `Converted By ${botName}`;

      const response = await fetch("https://carbonara.solopov.dev/api/cook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: code,
          backgroundColor: "#5a1f81",
        }),
      });

      if (!response.ok) {
        return reply("*Error:* API failed to fetch a valid response.");
      }

      const buffer = await response.arrayBuffer();
      await Javix.sendMessage(
        jid,
        {
          image: Buffer.from(buffer),
          caption: caption,
        },
        {
          quoted: messages,
        }
      );
    } catch (error) {
      console.error("Carbon error:", error);
      return reply(`*Error occurred:*\n${error.message}`);
    }
  },
};

export default carbonCommand;
