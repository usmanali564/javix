import { exec } from "child_process";
import { promisify } from "util";
import config from "#config";

const execAsync = promisify(exec);

const terminalCommand = {
  name: "terminal",
  aliases: ["cmd", "exec", "shell"],
  description: "Execute system commands (Owner only)",
  usage: "!terminal <command>",
  cooldown: 3000,
  ownerOnly: true,

  run: async ({ Javix, jid, message, args, sender, reply, isGroup, utils, isOwner }) => {
    try {
      if (!isOwner) {
        return reply("*Access Denied!*\nThis command is only for bot owners.");
      }

      const command = args.join(" ");

      if (!command) {
        return reply(`*💻 Terminal Command*\n\n*Usage:* ${utils.usage}\n*Example:* !terminal ls -la\n*Example:* !terminal node --version\n*Example:* !terminal pm2 status\n\n*⚠️ Warning:* This executes real system commands. Use with caution!`);
      }

      const dangerousCommands = ["rm -rf /", "rm -rf /*", "dd if=/dev/zero", "mkfs", "fdisk", "format", "del /s /q", "format c:", "shutdown", "halt", "poweroff", "reboot", "init 0", "init 6"];

      const lowerCommand = command.toLowerCase();
      for (const dangerous of dangerousCommands) {
        if (lowerCommand.includes(dangerous.toLowerCase())) {
          return reply(`*🚨 Security Alert!*\n\nCommand blocked for security reasons:\n\`${command}\`\n\nThis command could damage your system.`);
        }
      }

      const processingMsg = await reply("*🔄 Executing command...*\n\n`" + command + "`\n\nPlease wait...");

      try {
        const { stdout, stderr } = await execAsync(command, {
          timeout: 30000,
          maxBuffer: 1024 * 1024,
        });

        let result = "";

        result += `*💻 Command Executed:*\n\`${command}\`\n\n`;

        if (stdout) {
          result += `*📤 Output:*\n\`\`\`\n${stdout}\n\`\`\`\n`;
        }

        if (stderr) {
          result += `*Errors:*\n\`\`\`\n${stderr}\n\`\`\`\n`;
        }

        if (!stdout && !stderr) {
          result += `*✅ Command completed successfully*\n(No output generated)`;
        }

        result += `\n*⏱️ Status:* Completed\n*📊 Output Size:* ${(stdout?.length || 0) + (stderr?.length || 0)} characters`;

        if (result.length > 4000) {
          const parts = [];
          let currentPart = "";
          const lines = result.split("\n");

          for (const line of lines) {
            if ((currentPart + line + "\n").length > 4000) {
              parts.push(currentPart);
              currentPart = line + "\n";
            } else {
              currentPart += line + "\n";
            }
          }
          if (currentPart) {
            parts.push(currentPart);
          }

          for (let i = 0; i < parts.length; i++) {
            await reply(`*Part ${i + 1}/${parts.length}*\n\n${parts[i]}`);
          }
        } else {
          await reply(result);
        }
      } catch (error) {
        let errorMessage = `*Command Execution Failed*\n\n`;
        errorMessage += `*Command:* \`${command}\`\n\n`;

        if (error.code === "ETIMEDOUT") {
          errorMessage += `*Error:* Command timed out after 30 seconds\n`;
        } else if (error.code === "ENOBUFS") {
          errorMessage += `*Error:* Output too large (max 1MB)\n`;
        } else {
          errorMessage += `*Error:* ${error.message}\n`;
        }

        if (error.stderr) {
          errorMessage += `\n*Error Output:*\n\`\`\`\n${error.stderr}\n\`\`\``;
        }

        await reply(errorMessage);
      }
    } catch (error) {
      console.error("Terminal command error:", error);
      await reply("*Failed to execute terminal command!*\n\nError: " + error.message);
    }
  },
};

export default terminalCommand;
