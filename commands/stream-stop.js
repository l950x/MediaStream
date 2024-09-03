const { SlashCommandBuilder } = require("discord.js");
const path = require("path");
const fs = require("fs");
const adminCheck = require("../features/adminCheck");
const log = require("../features/log");
const txtLog = require("../features/txtLog");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("stream-stop")
    .setDescription("Stop the current stream media"),

  async execute(client, interaction) {
    await interaction.deferReply();
    log(`[+] Attempted to stop medias stream by ${interaction.user.username}.`,'green');
    if (!(await adminCheck(interaction.member.id))) {
      log(
        `[!] Unauthorized command attempt by ${interaction.user.username}.`,
        "yellow"
      );
      return await interaction.editReply(
        "You do not have permission to use this command."
      );
    }

    const ID_FILE_PATH = path.join(__dirname, "../public/assets/idfiles/");
    const MEDIA_FILE_PATH = path.join(__dirname, "../public/assets/uploads/");

    if (!fs.existsSync(ID_FILE_PATH)) {
      log("[!] No ID files found when attempting to stop stream.", "yellow");
      return await interaction.editReply("No ID found.");
    }

    try {
      const idFiles = fs.readdirSync(ID_FILE_PATH);
      for (const file of idFiles) {
        const filePath = path.join(ID_FILE_PATH, file);
        fs.unlinkSync(filePath);
        log(`[+] Deleted ID file: ${file}`, "green");
      }

      if (fs.existsSync(MEDIA_FILE_PATH)) {
        const mediaFiles = fs.readdirSync(MEDIA_FILE_PATH);
        for (const file of mediaFiles) {
          const filePath = path.join(MEDIA_FILE_PATH, file);
          fs.unlinkSync(filePath);
          log(`[+] Deleted media file: ${file}`, "green");
        }
      }

      await interaction.editReply(
        "The latest ID and media files have been deleted."
      );
      log(
        `[+] Stream medias stopped successfully by ${interaction.user.username}.`,
        "blue"
      );
    } catch (error) {
      txtLog("Error stopping stream: " + error);
      await interaction.editReply("Error: " + error);
    }
  },
};
