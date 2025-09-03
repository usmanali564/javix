import Birthday from "../../models/birthday.model.js";
import { extractTargetUserUniversal } from "../../utils/target.js";

const birthdayCommand = {
  name: "birthday",
  aliases: ["bday", "setbday"],
  description: "Set or view birthday information",
  usage: "!birthday [set/update/view/settings/remind/theme/privacy/menu] [options]",
  cooldown: 5000,

  run: async ({ Javix, jid, message, args, sender, reply, isGroup, utils, pushName }) => {
    try {
      const action = args[0]?.toLowerCase() || "menu";
      const userId = sender;
      const sessionId = Javix.user.id.split(":")[0];
      const name = pushName || "Unknown User";

      switch (action) {
        case "menu": {
          const menu =
            `*🎂 Birthday Command Menu*\n\n` +
            `*Available Commands:*\n` +
            `• \`!birthday set DD-MM-YYYY\` - Set your birthday\n` +
            `• \`!birthday update DD-MM-YYYY\` - Update your birthday\n` +
            `• \`!birthday view\` - View your birthday info\n` +
            `• \`!birthday list\` - List upcoming birthdays\n` +
            `• \`!birthday test\` - Test your wish control settings\n` +
            `• \`!birthday wish @user\` - Wish someone happy birthday\n` +
            `• \`!birthday delete\` - Remove your birthday info\n\n` +
            `*Wish Control Settings:*\n` +
            `• \`!birthday settings allgroups on/off\` - Send wishes to ALL groups\n` +
            `• \`!birthday settings mygroups on/off\` - Send wishes to groups where you set birthday\n` +
            `• \`!birthday settings private on/off\` - Send wishes to your private chat\n` +
            `• \`!birthday settings notify on/off\` - Toggle group notifications\n` +
            `• \`!birthday settings custom [message]\` - Set custom birthday message\n` +
            `• \`!birthday settings remind [days]\` - Set reminder days\n` +
            `• \`!birthday settings privacy [public/friends/private]\` - Set privacy\n` +
            `• \`!birthday settings theme [default/minimal/fun/formal]\` - Set theme\n\n` +
            `*Group Management:*\n` +
            `• \`!birthday groups\` - Manage birthday groups\n` +
            `• \`!birthday groups add\` - Add current group\n` +
            `• \`!birthday groups remove <id>\` - Remove group\n` +
            `• \`!birthday groups list\` - List all groups\n` +
            `• \`!birthday groups clear\` - Remove all groups\n\n` +
            `*Examples:*\n` +
            `• \`!birthday set 25-12-2000\`\n` +
            `• \`!birthday settings allgroups on\` - Send to ALL groups\n` +
            `• \`!birthday settings mygroups on\` - Send only to your groups\n` +
            `• \`!birthday settings private on\` - Send to your DM\n` +
            `• \`!birthday settings custom Happy Birthday! 🎉\`\n` +
            `• \`!birthday settings remind 1 7 30\`\n` +
            `• \`!birthday groups add\`\n` +
            `• \`!birthday delete confirm\` - Delete birthday info\n\n` +
            `*Wish Control Features:*\n` +
            `• 🎯 *All Groups:* Send wishes to every group the bot is in\n` +
            `• 🏠 *My Groups:* Send wishes only to groups where you set birthday\n` +
            `• 💬 *Private DM:* Send wishes to your private chat\n` +
            `• ⚙️ *Mix & Match:* Combine any of the above options\n` +
            `• 🔒 *Privacy Control:* Control who can see your birthday\n` +
            `• 🎨 *Custom Themes:* Choose your birthday message style\n` +
            `• 📅 *Smart Tracking:* Automatic birthday detection and wishes\n` +
            `• 🔄 *Retry System:* Reliable delivery with automatic retries`;

          await reply(menu);
          break;
        }

        case "set":
        case "update": {
          const dateStr = args.slice(1).join(" ");
          if (!dateStr) {
            return reply(`*Usage:* ${utils.usage}\n*Example:* !birthday set 01-01-2000`);
          }

          const dateRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
          if (!dateRegex.test(dateStr)) {
            return reply("*Invalid date format!*\nPlease use DD-MM-YYYY format.\n*Example:* 01-01-2000");
          }

          const [, day, month, year] = dateStr.match(dateRegex);
          const date = new Date(year, month - 1, day);

          if (date.getDate() !== parseInt(day) || date.getMonth() !== parseInt(month) - 1) {
            return reply("*Invalid date!* Please enter a valid date.");
          }

          if (date > new Date()) {
            return reply("*Invalid date!* Birth date cannot be in the future.");
          }

          const today = new Date();
          let age = today.getFullYear() - date.getFullYear();
          const monthDiff = today.getMonth() - date.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
            age--;
          }

          if (age < 0 || age > 120) {
            return reply("*Invalid age!* Age must be between 0 and 120 years.");
          }

          try {
            let birthday = await Birthday.findOne({ sessionId, userId });
            const chatType = isGroup ? "group" : "private";
            let groupInfo = null;

            if (isGroup) {
              const groupMetadata = await Javix.groupMetadata(jid);
              groupInfo = {
                groupId: jid,
                groupName: groupMetadata.subject || "Unknown Group",
                groupDescription: groupMetadata.desc || "",
                groupSize: groupMetadata.participants?.length || 0,
                setAt: new Date(),
              };
            }

            if (birthday) {
              birthday.date = date;
              birthday.name = name;
              birthday.age = age;
              birthday.number = sender.split("@")[0];
              birthday.lastUpdated = new Date();
              birthday.chatType = chatType;

              if (isGroup && groupInfo) {
                await birthday.addGroup(groupInfo);
              } else if (!isGroup) {
                await birthday.setPrivateChatInfo(sender.split("@")[0]);
              }

              await birthday.save();
              return reply(`*Birthday Updated!*\n\n👤 *Name:* ${name}\n📅 *Date:* ${dateStr}\n🎂 *Age:* ${age} years old\n📍 *Set in:* ${isGroup ? groupInfo.groupName : "Private Chat"}`);
            } else {
              birthday = new Birthday({
                sessionId,
                userId,
                name,
                number: sender.split("@")[0],
                date,
                age,
                notifications: true,
                customMessage: `Happy Birthday, {name}! 🎉`,
                privacy: "public",
                theme: "default",
                chatType: chatType,
              });

              if (isGroup && groupInfo) {
                await birthday.addGroup(groupInfo);
              } else if (!isGroup) {
                await birthday.setPrivateChatInfo(sender.split("@")[0]);
              }

              await birthday.save();
              return reply(`*Birthday Set!*\n\n👤 *Name:* ${name}\n📅 *Date:* ${dateStr}\n🎂 *Age:* ${age} years old\n📍 *Set in:* ${isGroup ? groupInfo.groupName : "Private Chat"}`);
            }
          } catch (error) {
            console.error("Error saving birthday:", error);
            if (error.message.includes("Invalid age")) {
              return reply("*Error!* Invalid age detected. Please check your birth date.");
            } else if (error.message.includes("Invalid phone number")) {
              return reply("*Error!* Invalid phone number format.");
            } else if (error.message.includes("future")) {
              return reply("*Error!* Birth date cannot be in the future.");
            }
            return reply("*Error!* Failed to save birthday. Please try again.");
          }
        }

        case "view": {
          try {
            const birthday = await Birthday.findOne({ sessionId, userId });
            if (!birthday) {
              return reply("*No birthday set!*\nUse `!birthday set DD-MM-YYYY` to set your birthday.");
            }

            const dateStr = birthday.date.toLocaleDateString("en-US", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            });

            const today = new Date();
            const birthDate = birthday.date;
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();

            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }

            const nextBirthday = new Date(birthday.date);
            nextBirthday.setFullYear(today.getFullYear());
            if (nextBirthday < today) {
              nextBirthday.setFullYear(today.getFullYear() + 1);
            }

            const daysUntil = Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
            const monthsUntil = Math.floor(daysUntil / 30);
            const remainingDays = daysUntil % 30;

            const getZodiacSign = (month, day) => {
              const signs = [
                { name: "Capricorn", start: { month: 12, day: 22 }, end: { month: 1, day: 19 } },
                { name: "Aquarius", start: { month: 1, day: 20 }, end: { month: 2, day: 18 } },
                { name: "Pisces", start: { month: 2, day: 19 }, end: { month: 3, day: 20 } },
                { name: "Aries", start: { month: 3, day: 21 }, end: { month: 4, day: 19 } },
                { name: "Taurus", start: { month: 4, day: 20 }, end: { month: 5, day: 20 } },
                { name: "Gemini", start: { month: 5, day: 21 }, end: { month: 6, day: 20 } },
                { name: "Cancer", start: { month: 6, day: 21 }, end: { month: 7, day: 22 } },
                { name: "Leo", start: { month: 7, day: 23 }, end: { month: 8, day: 22 } },
                { name: "Virgo", start: { month: 8, day: 23 }, end: { month: 9, day: 22 } },
                { name: "Libra", start: { month: 9, day: 23 }, end: { month: 10, day: 22 } },
                { name: "Scorpio", start: { month: 10, day: 23 }, end: { month: 11, day: 21 } },
                { name: "Sagittarius", start: { month: 11, day: 22 }, end: { month: 12, day: 21 } },
              ];

              return (
                signs.find((sign) => {
                  if (sign.start.month === sign.end.month) {
                    return month === sign.start.month && day >= sign.start.day && day <= sign.end.day;
                  }
                  if (sign.start.month < sign.end.month) {
                    return (month === sign.start.month && day >= sign.start.day) || (month === sign.end.month && day <= sign.end.day);
                  }
                  return (month === sign.start.month && day >= sign.start.day) || (month === sign.end.month && day <= sign.end.day);
                })?.name || "Unknown"
              );
            };

            const zodiacSign = getZodiacSign(birthDate.getMonth() + 1, birthDate.getDate());

            let info =
              `*🎂 Birthday Information*\n\n` +
              `👤 *Name:* ${birthday.name}\n` +
              `📅 *Date:* ${dateStr}\n` +
              `🎂 *Age:* ${age} years old\n` +
              `✨ *Zodiac Sign:* ${zodiacSign}\n` +
              `⏳ *Next Birthday:* ${monthsUntil} months and ${remainingDays} days\n` +
              `🔔 *Notifications:* ${birthday.notifications ? "Enabled" : "Disabled"}\n` +
              `🔒 *Privacy:* ${birthday.privacy}\n` +
              `🎨 *Theme:* ${birthday.theme}\n`;

            if (birthday.chatType === "group" && birthday.groups && birthday.groups.length > 0) {
              info += `📍 *Set in Groups:*\n`;
              birthday.groups.forEach((group, index) => {
                const setDate = new Date(group.setAt).toLocaleDateString();
                info += `   ${index + 1}. ${group.groupName} (${setDate})\n`;
              });
            } else if (birthday.chatType === "private") {
              const setDate = birthday.privateChatInfo?.setAt ? new Date(birthday.privateChatInfo.setAt).toLocaleDateString() : "Unknown";
              info += `📍 *Set in:* Private Chat (${setDate})\n`;
            }

            info += `\n*🎉 Wish Control Settings:*\n` + `• 🎯 All Groups: ${birthday.wishInAllGroups ? "✅" : "❌"}\n` + `• 🏠 My Groups: ${birthday.wishInGroups ? "✅" : "❌"}\n` + `• 💬 Private DM: ${birthday.wishInPrivate ? "✅" : "❌"}\n`;

            if (birthday.streak > 0) {
              info += `🔥 *Streak:* ${birthday.streak} years\n`;
            }

            if (birthday.totalWishes > 0) {
              info += `🎉 *Total Wishes:* ${birthday.totalWishes}\n`;
            }

            if (birthday.wishes && birthday.wishes.length > 0) {
              const recentWishes = birthday.wishes.slice(-3).reverse();
              info += `\n*Recent Wishes:*\n`;
              recentWishes.forEach((wish) => {
                const wishDate = new Date(wish.timestamp).toLocaleDateString();
                info += `• ${wishDate}: ${wish.message}\n`;
              });
            }

            return reply(info);
          } catch (error) {
            console.error("Error fetching birthday:", error);
            return reply("*Error!* Failed to fetch birthday information.");
          }
        }

        case "settings": {
          const setting = args[1]?.toLowerCase();
          const value = args[2]?.toLowerCase();

          if (!setting || !value) {
            return reply("*Invalid settings!*\nUse: !birthday settings [allgroups/mygroups/private/notify/custom/remind/privacy/theme] [value]");
          }

          const birthday = await Birthday.findOne({ sessionId, userId });
          if (!birthday) {
            return reply("*No birthday set!*\nSet your birthday first using `!birthday set DD-MM-YYYY`");
          }

          switch (setting) {
            case "allgroups":
              if (value !== "on" && value !== "off") {
                return reply("*Invalid value!*\nUse: on/off");
              }
              birthday.wishInAllGroups = value === "on";
              await birthday.save();
              await reply(`*🎯 All Groups Setting Updated!*\nSend wishes to ALL groups: ${value === "on" ? "✅ Enabled" : "❌ Disabled"}\n\n*Note:* This will send birthday wishes to every group the bot is in, regardless of where you set your birthday.`);
              break;

            case "mygroups":
              if (value !== "on" && value !== "off") {
                return reply("*Invalid value!*\nUse: on/off");
              }
              birthday.wishInGroups = value === "on";
              await birthday.save();
              await reply(`*🏠 My Groups Setting Updated!*\nSend wishes to groups where you set birthday: ${value === "on" ? "✅ Enabled" : "❌ Disabled"}\n\n*Note:* This will only send wishes to groups where you used \`!birthday set\` or \`!birthday groups add\`.`);
              break;

            case "private":
              if (value !== "on" && value !== "off") {
                return reply("*Invalid value!*\nUse: on/off");
              }
              birthday.wishInPrivate = value === "on";
              await birthday.save();
              await reply(`*💬 Private DM Setting Updated!*\nSend wishes to your private chat: ${value === "on" ? "✅ Enabled" : "❌ Disabled"}\n\n*Note:* This will send birthday wishes to your personal WhatsApp chat.`);
              break;

            case "notify":
              if (value !== "on" && value !== "off") {
                return reply("*Invalid value!*\nUse: on/off");
              }
              birthday.notifications = value === "on";
              await birthday.save();
              await reply(`*Notification settings updated!*\nNotifications: ${value === "on" ? "enabled" : "disabled"}`);
              break;

            case "custom":
              const customMessage = args.slice(2).join(" ");
              if (!customMessage) {
                return reply("*Please provide a custom message!*");
              }
              birthday.customMessage = customMessage;
              await birthday.save();
              await reply(`*Custom message updated!*\nYour birthday message: ${customMessage}`);
              break;

            case "remind":
              const days = args
                .slice(2)
                .map(Number)
                .filter((n) => !isNaN(n));
              if (days.length === 0) {
                return reply("*Please provide valid reminder days!*\nExample: !birthday settings remind 1 7 30");
              }
              birthday.reminderDays = days;
              await birthday.save();
              await reply(`*Reminder settings updated!*\nYou will be reminded ${days.join(", ")} days before your birthday.`);
              break;

            case "privacy":
              if (!["public", "friends", "private"].includes(value)) {
                return reply("*Invalid privacy setting!*\nUse: public/friends/private");
              }
              birthday.privacy = value;
              await birthday.save();
              await reply(`*Privacy settings updated!*\nYour birthday is now ${value}.`);
              break;

            case "theme":
              if (!["default", "minimal", "fun", "formal"].includes(value)) {
                return reply("*Invalid theme!*\nUse: default/minimal/fun/formal");
              }
              birthday.theme = value;
              await birthday.save();
              await reply(`*Theme updated!*\nYour birthday messages will now use the ${value} theme.`);
              break;

            default:
              await reply("*Invalid setting!*\nAvailable settings: allgroups/mygroups/private/notify/custom/remind/privacy/theme");
          }
          break;
        }

        case "test": {
          const birthday = await Birthday.findOne({ sessionId, userId });
          if (!birthday) {
            return reply("*No birthday set!*\nSet your birthday first using `!birthday set DD-MM-YYYY`");
          }

          let testMessage = `*🎂 Birthday Wish Control Test*\n\n`;
          testMessage += `*Current Settings:*\n`;
          testMessage += `• 🎯 All Groups: ${birthday.wishInAllGroups ? "✅ ON" : "❌ OFF"}\n`;
          testMessage += `• 🏠 My Groups: ${birthday.wishInGroups ? "✅ ON" : "❌ OFF"}\n`;
          testMessage += `• 💬 Private DM: ${birthday.wishInPrivate ? "✅ ON" : "❌ OFF"}\n\n`;

          testMessage += `*What would happen on your birthday:*\n`;

          if (birthday.wishInAllGroups) {
            testMessage += `🎯 *ALL GROUPS:* Bot will send wishes to EVERY group it's in where you're a member\n`;
          }

          if (birthday.wishInGroups && birthday.groups && birthday.groups.length > 0) {
            testMessage += `🏠 *MY GROUPS:* Bot will send wishes to these groups:\n`;
            birthday.groups.forEach((group, index) => {
              testMessage += `   ${index + 1}. ${group.groupName}\n`;
            });
          } else if (birthday.wishInGroups) {
            testMessage += `🏠 *MY GROUPS:* No groups found (use \`!birthday groups add\` in a group)\n`;
          }

          if (birthday.wishInPrivate) {
            testMessage += `💬 *PRIVATE DM:* Bot will send a wish to your personal chat\n`;
          }

          if (!birthday.wishInAllGroups && !birthday.wishInGroups && !birthday.wishInPrivate) {
            testMessage += `⚠️ *NO WISHES:* You have disabled all wish options. No birthday wishes will be sent.\n`;
          }

          testMessage += `\n*To change settings:*\n`;
          testMessage += `• \`!birthday settings allgroups on/off\`\n`;
          testMessage += `• \`!birthday settings mygroups on/off\`\n`;
          testMessage += `• \`!birthday settings private on/off\`\n`;

          return reply(testMessage);
        }

        case "list": {
          const today = new Date();
          const birthdays = await Birthday.find({
            sessionId,
            $expr: {
              $and: [{ $gte: [{ $month: "$date" }, today.getMonth() + 1] }, { $gte: [{ $dayOfMonth: "$date" }, today.getDate()] }],
            },
          })
            .sort({ "date.month": 1, "date.day": 1 })
            .limit(10);

          if (birthdays.length === 0) {
            return reply("*No upcoming birthdays found!*");
          }

          let message = "*🎂 Upcoming Birthdays*\n\n";
          birthdays.forEach((bday, index) => {
            const daysUntil = Math.ceil((bday.nextBirthday - today) / (1000 * 60 * 60 * 24));
            message += `${index + 1}. ${bday.name} - ${bday.date.getDate()}/${bday.date.getMonth() + 1} (in ${daysUntil} days)\n`;
          });

          await reply(message);
          break;
        }

        case "wish": {
          // Use universal extraction utility
          const { targetJid } = extractTargetUserUniversal({ m: message, args: args.slice(1), message });
          if (!targetJid) {
            return reply("*Please mention someone to wish!* (use @user, reply, or number)");
          }

          const birthday = await Birthday.findOne({ sessionId, userId: targetJid });
          if (!birthday) {
            return reply("*This user hasn't set their birthday yet!*");
          }

          const today = new Date();
          if (birthday.date.getDate() !== today.getDate() || birthday.date.getMonth() !== today.getMonth()) {
            return reply("*It's not their birthday today!*");
          }

          const wishMessage = args.slice(2).join(" ") || `Happy Birthday ${birthday.name}! 🎉`;

          birthday.wishes.push({
            year: today.getFullYear(),
            message: wishMessage,
            timestamp: today,
            wishedBy: sender,
          });
          birthday.totalWishes++;
          await birthday.save();

          await reply(`*🎂 Birthday Wish Sent!*\n\n${wishMessage}`);
          break;
        }

        case "delete": {
          const birthday = await Birthday.findOne({ sessionId, userId });

          if (!birthday) {
            return reply("*No birthday set!* You don't have a birthday to delete.");
          }

          const confirmMessage = `*⚠️ Confirm Birthday Deletion*\n\n` + `Are you sure you want to delete your birthday information?\n` + `This will remove:\n` + `• Your birthday date\n` + `• All birthday wishes\n` + `• Your settings and preferences\n` + `• Your birthday statistics\n\n` + `Reply with \`!birthday delete confirm\` to confirm deletion.`;

          if (args[1]?.toLowerCase() !== "confirm") {
            return reply(confirmMessage);
          }

          await Birthday.deleteOne({ sessionId, userId });
          await reply("*🎂 Birthday Information Deleted*\n\nYour birthday information has been successfully removed.");
          break;
        }

        case "groups": {
          const action = args[1]?.toLowerCase();

          if (!action) {
            const birthday = await Birthday.findOne({ sessionId, userId });
            if (!birthday) {
              return reply("*No birthday set!*\nSet your birthday first using `!birthday set DD-MM-YYYY`");
            }

            let message = `*🎂 Birthday Group Settings*\n\n`;

            if (birthday.groups && birthday.groups.length > 0) {
              message += `*Groups where you set birthday:*\n`;
              birthday.groups.forEach((group, index) => {
                const setDate = new Date(group.setAt).toLocaleDateString();
                message += `${index + 1}. ${group.groupName} (${setDate})\n`;
              });
            } else {
              message += `*No groups found*\n`;
            }

            message += `\n*Commands:*\n` + `• \`!birthday groups add\` - Add current group\n` + `• \`!birthday groups remove <group_id>\` - Remove group\n` + `• \`!birthday groups list\` - List all groups\n` + `• \`!birthday groups clear\` - Remove all groups`;

            return reply(message);
          }

          const birthday = await Birthday.findOne({ sessionId, userId });
          if (!birthday) {
            return reply("*No birthday set!*\nSet your birthday first using `!birthday set DD-MM-YYYY`");
          }

          switch (action) {
            case "add": {
              if (!isGroup) {
                return reply("*This command can only be used in groups!*");
              }

              try {
                const groupMetadata = await Javix.groupMetadata(jid);
                const groupInfo = {
                  groupId: jid,
                  groupName: groupMetadata.subject || "Unknown Group",
                  groupDescription: groupMetadata.desc || "",
                  groupSize: groupMetadata.participants?.length || 0,
                  setAt: new Date(),
                };

                await birthday.addGroup(groupInfo);
                return reply(`*Group added successfully!*\n\n📱 *Group:* ${groupInfo.groupName}\n📍 *ID:* ${groupInfo.groupId}\n👥 *Members:* ${groupInfo.groupSize}`);
              } catch (error) {
                console.error("Error adding group:", error);
                return reply("*Error!* Failed to add group. Please try again.");
              }
            }

            case "remove": {
              const groupId = args[2];
              if (!groupId) {
                return reply("*Please provide a group ID!*\nUse `!birthday groups list` to see group IDs");
              }

              try {
                await birthday.removeGroup(groupId);
                return reply("*Group removed successfully!*");
              } catch (error) {
                console.error("Error removing group:", error);
                return reply("*Error!* Failed to remove group. Please try again.");
              }
            }

            case "list": {
              if (!birthday.groups || birthday.groups.length === 0) {
                return reply("*No groups found!*\nUse `!birthday groups add` in a group to add it.");
              }

              let message = `*🎂 Birthday Groups*\n\n`;
              birthday.groups.forEach((group, index) => {
                const setDate = new Date(group.setAt).toLocaleDateString();
                message += `${index + 1}. *${group.groupName}*\n` + `   📱 ID: \`${group.groupId}\`\n` + `   👥 Members: ${group.groupSize}\n` + `   📅 Set: ${setDate}\n\n`;
              });

              return reply(message);
            }

            case "clear": {
              birthday.groups = [];
              birthday.setInGroup = false;
              await birthday.save();
              return reply("*All groups cleared!*\nYou will no longer receive birthday wishes in groups.");
            }

            default:
              return reply("*Invalid action!*\nUse: add/remove/list/clear");
          }
          break;
        }

        default:
          await reply("*Invalid action!*\nUse `!birthday menu` to see all available commands.");
      }
    } catch (error) {
      console.error("Birthday command error:", error);
      await reply("*Failed to process birthday command!*");
    }
  },
};

export default birthdayCommand;
