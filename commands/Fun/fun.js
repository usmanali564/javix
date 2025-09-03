const vibeCommand = {
  name: "vibe",
  aliases: ["mood", "feeling"],
  description: "Check your current vibe",
  usage: "!vibe",
  cooldown: 3000,

  run: async ({ Javix, jid, messages, senderName }) => {
    try {
      const vibes = ["✨ Feeling magical!", "🌟 Super positive vibes!", "😊 Happy and cheerful!", "🎵 In a musical mood!", "🌞 Bright and sunny!", "🌈 Colorful and vibrant!", "🎮 Gaming vibes!", "📚 Bookworm mode!", "🎨 Creative energy!", "💪 Feeling powerful!", "😴 Sleepy vibes...", "🤔 Deep in thought...", "🎭 Dramatic mood!", "🍕 Foodie vibes!", "🎬 Movie marathon mode!"];

      const randomVibe = vibes[Math.floor(Math.random() * vibes.length)];
      const message = `🎭 *Vibe Check*\n\n` + `👤 *${senderName}'s vibe:*\n` + `${randomVibe}`;

      await Javix.sendMessage(jid, { text: message }, { quoted: messages });
    } catch (error) {
      console.error("Vibe command error:", error);
      await Javix.sendMessage(jid, { text: "*Failed to check your vibe!*" }, { quoted: messages });
    }
  },
};

export default vibeCommand;
