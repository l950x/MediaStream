const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const {
  STREAM_MEDIA_DESCRIPTION,
  STREAM_TTS_DESCRIPTION,
  STREAM_MEDIATEXT_DESCRIPTION,
  STREAM_TEXT_DESCRIPTION,
} = require("../config.json");
module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Get information about the commands"),
  async execute(client, interaction) {
    let commands = null;
    commands = "**/help** - Get information about the commands\n";
    commands = "**/stream-text** - " + STREAM_TEXT_DESCRIPTION + "\n";
    commands += "**/stream-media**- " + STREAM_MEDIA_DESCRIPTION + "\n";
    commands +=
      "**/stream-mediatext** - " + STREAM_MEDIATEXT_DESCRIPTION + "\n";
    commands += "**/stream-tts** - " + STREAM_TTS_DESCRIPTION + "\n";
    commands += "**/stream-tiktok** - [CURRENTLY NOT WORKING}\n";

    const embed = new EmbedBuilder()
      .setTitle("List of available commands")
      .setDescription(commands)
      .setColor("#b300ff");
    if (!interaction.replied) {
      await interaction.reply({ embeds: [embed] });
    }
  },
};
