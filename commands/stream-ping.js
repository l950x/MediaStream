const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stream-ping")
    .setDescription("send a ping"),
  async execute(client, interaction) {
    await interaction.reply("Pong!");
  },
};
