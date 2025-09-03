import config from "#config";

const ownerCommand = {
  name: "owner",
  aliases: ["creator", "developer"],
  description: "Send the owner's contact as a WhatsApp contact card.",
  usage: "!owner",
  cooldown: 3000,

  run: async ({ Javix, messages: m, reply }) => {
    const ownerNumbers = Array.isArray(config.ownerNumber) ? config.ownerNumber : [config.ownerNumber];
    const ownerName = config.ownerName || "Owner";

    let contacts = [];
    for (let i of ownerNumbers) {
      const waid = i.replace(/[^0-9]/g, "");
      const displayName = ownerName;
      let vcard = `BEGIN:VCARD\nVERSION:3.0\nN:${displayName}\nFN:${ownerName}`;
      vcard += `\nTEL;waid=${waid}:${waid}`;
      vcard += `\nEND:VCARD`;
      contacts.push({ displayName, vcard });
    }
    await Javix.sendMessage(
      m.chat,
      {
        contacts: {
          displayName: contacts.length === 1 ? contacts[0].displayName : "Owners",
          contacts,
        },
      },
      { quoted: m }
    );
  },
};

export default ownerCommand;
