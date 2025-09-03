import config from "#config";
import { getSystemInfo, runtime } from "@nexoracle/utils";
import BotMode from "../../models/botmode.model.js";

const help = async ({ Javix, args, reply, commands, prefix, chat, messages: m, botName, botPic }) => {
  const sessionId = Javix.user.id.split(":")[0];
  const { mode } = await BotMode.getCurrentMode(sessionId);

  if (!args.length) {
    const commandList = Array.from(commands.entries())
      .filter(([name, cmd]) => !cmd.aliases?.includes(name))
      .sort(([a], [b]) => a.localeCompare(b));

    const cmds = {};
    commandList.forEach(([name, command]) => {
      const category = command.category || "general";
      if (!cmds[category]) cmds[category] = [];
      cmds[category].push({ name, command });
    });

    let helpText = `\`\`\`
┏━━━◈ ${botName} ━━━◈
┃Owner: ${config.ownerName}
┃Prefix: ${prefix}
┃Mode: ${mode.toLowerCase()}
┃Uptime: ${runtime(process.uptime(), false, "d", "h", "m", "s")}
┃Commands: ${commands.size}
┃Platform: ${getSystemInfo().platform}
┃Ram: ${getSystemInfo().freeMemory} / ${getSystemInfo().totalMemory}
┗━━━━━━━━━━━◈
\`\`\``;

    let indexCount = 1;
    for (const category in cmds) {
      helpText += `\n┏━━◈ ${category.toLocaleUpperCase()} ━━◈\n`;
      cmds[category].forEach(({ name }) => {
        helpText += `┃ ${indexCount++}. ${prefix}${name.toLocaleLowerCase()}\n`;
      });
      helpText += "┗━━━━━━━━━━━◈\n\n";
    }

    helpText += `*Usage:*\n`;
    helpText += `• \`${prefix}help\` - Show this menu\n`;
    helpText += `• \`${prefix}help <command>\` - Show detailed command info\n`;
    helpText += `• \`${prefix}help search <query>\` - Search for commands\n\n`;
    helpText += `_Type ${prefix}help <command> for detailed info_`;

    await Javix.sendMessage(
      chat,
      {
        image: { url: botPic() },
        caption: helpText.trim(),
      },
      { quoted: m }
    );
    return;
  }

  if (args[0].toLowerCase() === "search" && args.length > 1) {
    const query = args.slice(1).join(" ").toLowerCase();
    const matches = Array.from(commands.entries()).filter(([name, cmd]) => {
      const searchStr = `${name} ${cmd.aliases?.join(" ")} ${cmd.description}`.toLowerCase();
      return searchStr.includes(query);
    });

    if (!matches.length) {
      await reply(`No commands found matching "*${query}*"`);
      return;
    }

    let searchText = `\`\`\`
┏━━◈ SEARCH RESULTS ━◈
┃Query: ${query}
┃Found: ${matches.length} commands
┗━━━━━━━━━━━◈
\`\`\`\n\n`;

    matches.forEach(([name, cmd], index) => {
      searchText += `┏━━◈ ${index + 1}. ${name.toUpperCase()} ━━◈\n`;
      searchText += `┃ *Name:* ${prefix}${name}\n`;
      if (cmd.aliases?.length) searchText += `┃ *Aliases:* ${cmd.aliases.map((a) => `${prefix}${a}`).join(", ")}\n`;
      if (cmd.description) searchText += `┃ *Description:* ${cmd.description}\n`;
      searchText += "┗━━━━━━━━━━━◈\n\n";
    });

    searchText += `_Use ${prefix}help <command> for detailed info_`;

    await reply(searchText.trim());
    return;
  }

  const name = args[0].toLowerCase();
  const command = commands.get(name);

  if (!command) {
    await reply(`Command not found: *${name}*\n\nTry:\n• \`${prefix}help\` to see all commands\n• \`${prefix}help search <query>\` to search commands`);
    return;
  }

  let detail = `\`\`\`
┏━━◈ COMMAND DETAILS ━━◈
┃Command: ${prefix}${command.name}
┗━━━━━━━━━━━◈
\`\`\`\n\n`;

  detail += `┏━━◈ INFO ━━◈\n`;
  detail += `┃ *Name:* ${prefix}${command.name}\n`;
  if (command.aliases?.length) detail += `┃ *Aliases:* ${command.aliases.map((a) => `${prefix}${a}`).join(", ")}\n`;
  if (command.description) detail += `┃ *Description:* ${command.description}\n`;
  if (command.usage) detail += `┃ *Usage:* \`${command.usage.replace(/!/g, prefix)}\`\n`;
  detail += "┗━━━━━━━━━━━◈\n\n";

  detail += `┏━━◈ SETTINGS ━━◈\n`;
  if (command.cooldown) detail += `┃ *Cooldown:* ${command.cooldown}ms\n`;
  if (command.ownerOnly) detail += `┃ *Access:* Owner Only\n`;
  if (command.adminOnly) detail += `┃ *Access:* Admin Only\n`;
  if (command.minArgs !== undefined) detail += `┃ *Min Args:* ${command.minArgs}\n`;
  if (command.maxArgs !== undefined) detail += `┃ *Max Args:* ${command.maxArgs}\n`;
  detail += `┃ *Category:* ${command.category || "general"}\n`;
  detail += "┗━━━━━━━━━━━◈";

  await reply(detail.trim());
};

export default {
  name: "menu",
  aliases: ["help", "commands"],
  description: "Lists all available commands with descriptions. Use `help <command>` for detailed info.",
  cooldown: 2000,
  category: "general",
  run: help,
};
