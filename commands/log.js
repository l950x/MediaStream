const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const log = require("../features/log");
const adminCheck = require("../features/adminCheck");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("log")
    .setDescription("get logs from today"),

  async execute(client, interaction) {
    if (!(await adminCheck(interaction.member))) {
      return await interaction.reply({
        content: "Permission required",
        ephemeral: true,
      });
    }
    const currentDate = new Date().toLocaleDateString('fr-CA');
    const logFilePath = `logs/log-${currentDate}.txt`;

    try {
      if (fs.existsSync(logFilePath)) {
        const logFileContent = fs.readFileSync(logFilePath, "utf8");
        await interaction.reply({
          content: "Logs from today:",
          files: [
            {
              attachment: Buffer.from(logFileContent),
              name: `log-${currentDate}.txt`,
            },
          ],
          ephemeral: true,
        });
      } else {
        await interaction.reply({
          content: "No logs from today",
          ephemeral: true,
        });
      }
    } catch (error) {
      log("[!] Error :" + error, "yellow");
      await interaction.reply({
        content: "Error",
        ephemeral: true,
      });
    }
  },
};
