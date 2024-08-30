const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Get information about the commands"),
  async execute(client, interaction) {
    let commands = null;
    commands = "**/help** - Get information about the commands\n\n";

    const embed = new EmbedBuilder()
      .setTitle("List of available commands")
      .setDescription(commands)
      .setColor("#b300ff");
    if (!interaction.replied) {
      await interaction.reply({ embeds: [embed] });
    }
  },
};
