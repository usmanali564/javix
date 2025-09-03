export function extractTargetUserUniversal({ m, args, message }) {
  if (m && m.quoted && m.quoted.sender) {
    const jid = m.quoted.sender;
    return { targetJid: jid, targetNumber: jid.replace(/[^0-9]/g, "") };
  }
  if (message && message.mentions && message.mentions[0]) {
    const jid = message.mentions[0];
    return { targetJid: jid, targetNumber: jid.replace(/[^0-9]/g, "") };
  }
  if (args && args[0] && args[0].startsWith("@")) {
    const jid = args[0].replace("@", "") + "@s.whatsapp.net";
    return { targetJid: jid, targetNumber: jid.replace(/[^0-9]/g, "") };
  }
  if (args && args[0] && args[0].replace(/[^0-9]/g, "")) {
    const number = args[0].replace(/[^0-9]/g, "");
    return { targetJid: number + "@s.whatsapp.net", targetNumber: number };
  }
  return { targetJid: null, targetNumber: null };
}
