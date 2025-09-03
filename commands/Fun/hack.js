import { sleep } from "@nexoracle/utils";

const hackCommand = {
  name: "hack",
  aliases: ["prank"],
  description: "hack prank on someone",
  usage: "!hack",
  cooldown: 3000,

  run: async ({senderName, reply, edit }) => {
    const textFrames = [
      "```Injecting malware```",
      "```Injecting malware \n 0%```",
      "```Injecting malware \n █ 10%```",
      "```Injecting malware \n █ █ 20%```",
      "```Injecting malware \n █ █ █ 30%```",
      "```Injecting malware \n █ █ █ █ 40%```",
      "```Injecting malware \n █ █ █ █ █ 50%```",
      "```Injecting malware \n █ █ █ █ █ █ 60%```",
      "```Injecting malware \n █ █ █ █ █ █ █ 70%```",
      "```Injecting malware \n █ █ █ █ █ █ █ █ 80%```",
      "```Injecting malware \n █ █ █ █ █ █ █ █ █ 90%```",
      "```Injecting malware \n █ █ █ █ █ █ █ █ █ █ 100%```",
      `\`\`\`${senderName}'s Device Successfully Connected... \n Reciving Whatsapp data...\`\`\``,
      `\`\`\`${senderName}'s Data Hacked from Device 100% Completed \n Killing Virus and Malwares...\`\`\``,
      "``` SENDING DATA TO SERVER...```",
      "``` SUCCESSFULLY SENT DATA AND TERMINATED CONNECTION```",
      "*TRACES & BACKLOGS CLEARED*",
      "``` HACKING COMPLETED ```",
    ];

    try {
      const sentMsg = await reply(textFrames[0]);

      for (let i = 1; i < textFrames.length; i++) {
        await sleep(2000);
        await edit(textFrames[i], sentMsg.key);
      }
    } catch (error) {
      console.error("Error in hack command:", error);
      await reply("*Hacking failed!*");
    }
  },
};


export default hackCommand;
