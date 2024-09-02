const { SlashCommandBuilder } = require("discord.js");
const log = require("../features/log");
const adminCheck = require("../features/adminCheck");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Dead the bot"),

  async execute(client, interaction) {
    if (!(await adminCheck(interaction.member.id))) {
      return await interaction.reply(
        "You do not have permission to use this command."
      );
    }

    await interaction.reply("dead");

    log("[X] Bot stopped");
    process.exit();
  },
};
