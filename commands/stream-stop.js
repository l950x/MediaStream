const { SlashCommandBuilder } = require("discord.js");
const path = require("path");
const fs = require("fs");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stream-stop")
    .setDescription("stop the current stream media"),
  async execute(client, interaction) {
    const ID_FILE_PATH = path.join(__dirname, "../latest_id.txt");

    if (!fs.existsSync(ID_FILE_PATH)) {
      return await interaction.reply("No ID found.");
    }
    try {
      fs.unlinkSync(ID_FILE_PATH);
      await interaction.reply("The latest ID has been deleted.");
    } catch (error) {
      await interaction.reply("Error: " + error);
    }
  },
};
