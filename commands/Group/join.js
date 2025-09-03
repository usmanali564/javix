const joinCommand = {
  name: "join",
  aliases: ["joingroup"],
  description: "Join a group using invite link",
  usage: "!join <invite-link>",
  cooldown: 10000,
  ownerOnly: true,

  run: async ({ Javix, messages: m, jid, args, isOwner, isSelf, react }) => {
    if (!isOwner && !isSelf) {
      (await react) && react("❌");
      return await Javix.sendMessage(
        jid,
        {
          text: "*Access Denied!* Only the bot owner can use this command.",
        },
        { quoted: m }
      );
    }

    try {
      (await react) && react("🫡");

      if (!args[0]) {
        (await react) && react("❌");
        return await Javix.sendMessage(
          jid,
          {
            text: "*Where's the link?*\n\n📝 *Usage:* !join <invite-link>",
          },
          { quoted: m }
        );
      }

      const inviteLink = args[0];
      const inviteCode = inviteLink.split("https://chat.whatsapp.com/")[1];

      if (!inviteCode) {
        (await react) && react("❌");
        return await Javix.sendMessage(
          jid,
          {
            text: "*Invalid invite link!*",
          },
          { quoted: m }
        );
      }

      if (isOwner || isSelf) {
        try {
          const result = await Javix.groupAcceptInvite(inviteCode);
          (await react) && react("✅");
          await Javix.sendMessage(
            jid,
            {
              text: `✅ *Successfully joined the group!*`,
            },
            { quoted: m }
          );
        } catch (error) {
          (await react) && react("❌");
          await Javix.sendMessage(
            jid,
            {
              text: "*Failed to join group!*",
            },
            { quoted: m }
          );
        }
      } else {
        try {
          const queryResult = await Javix.query({
            tag: "iq",
            attrs: {
              type: "get",
              xmlns: "w:g2",
              to: "@g.us",
            },
            content: [{ tag: "invite", attrs: { code: inviteCode } }],
          });

          const groupSize = queryResult.content[0].attrs.size;

          if (groupSize < 20) {
            (await react) && react("❌");
            await Javix.sendMessage(
              jid,
              {
                text: "*Minimum 18 members required!*",
              },
              { quoted: m }
            );
          } else {
            const result = await Javix.groupAcceptInvite(inviteCode);
            (await react) && react("✅");
            await Javix.sendMessage(
              jid,
              {
                text: `✅ *Joined!* (${groupSize} members)`,
              },
              { quoted: m }
            );
          }
        } catch (error) {
          (await react) && react("❌");
          await Javix.sendMessage(
            jid,
            {
              text: "*Error checking group!*",
            },
            { quoted: m }
          );
        }
      }
    } catch (error) {
      (await react) && react("❌");
      console.error("Join command error:", error);
      await Javix.sendMessage(
        jid,
        {
          text: "*An error occurred!*",
        },
        { quoted: m }
      );
    }
  },
};

export default joinCommand;
