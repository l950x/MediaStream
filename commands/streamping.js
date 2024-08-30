const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("streamping")
    .setDescription("send a ping"),
  async execute(client, interaction) {
    await interaction.reply("Pong!");
  },
};
