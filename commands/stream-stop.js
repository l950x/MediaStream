const { SlashCommandBuilder } = require("discord.js");
const path = require("path");
const fs = require("fs");
const adminCheck = require("../features/adminCheck");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stream-stop")
    .setDescription("stop the current stream media"),
  async execute(client, interaction) {
    if (!await adminCheck(interaction.member.id)) {
      return await interaction.reply(
        "You do not have permission to use this command."
      );
    }

    const ID_FILE_PATH = path.join(__dirname, "../public/assets/idfiles/");
    const MEDIA_FILE_PATH = path.join(__dirname, "../public/assets/uploads/");

    if (!fs.existsSync(ID_FILE_PATH)) {
      return await interaction.reply("No ID found.");
    }

    try {
      const files = fs.readdirSync(ID_FILE_PATH);
      for (const file of files) {
        const filePath = path.join(ID_FILE_PATH, file);
        fs.unlinkSync(filePath);
      }
      if (fs.existsSync(MEDIA_FILE_PATH)) {
        const files = fs.readdirSync(MEDIA_FILE_PATH);
        for (const file of files) {
          const filePath = path.join(MEDIA_FILE_PATH, file);
          fs.unlinkSync(filePath);
        }
      }
      await interaction.reply("The latest ID has been deleted.");
    } catch (error) {
      await interaction.reply("Error: " + error);
    }
  },
};
