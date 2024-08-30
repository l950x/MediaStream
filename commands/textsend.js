const { SlashCommandBuilder } = require("@discordjs/builders");
const { AttachmentBuilder, Embed } = require("discord.js");
const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch");
const ffmpeg = require("fluent-ffmpeg");
const { v4: uuidv4 } = require("uuid");
const { text } = require("body-parser");
const { EmbedBuilder } = require("discord.js");

const ID_FILE_PATH = path.join(__dirname, "../latest_id.txt");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("textsend")
    .setDescription("Send media to display on Streamlabs with a duration")
    .addStringOption((option) =>
      option
        .setName("text")
        .setDescription("The text to display")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("duration")
        .setDescription("Duration to display the media (seconds)")
        .addChoices(
          { name: "5 seconds", value: 5 },
          { name: "10 seconds", value: 10 },
          { name: "15 seconds", value: 15 },
          { name: "20 seconds", value: 20 }
        )
    ),

  async execute(client, interaction) {
    const text = interaction.options.getString("text");
    let duration = interaction.options.getInteger("duration");

    if (!duration) {
      duration = 5;
    }

    if (text) {
      try {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("#b300ff")
              .setTitle(
                `Text received and will be displayed for ${duration} seconds`
              )
              .setDescription(`${text}`)
              .setTimestamp(),
          ],
        });

        fs.writeFileSync(ID_FILE_PATH, text + "?text");
        setTimeout(() => {
          fs.unlinkSync(ID_FILE_PATH);
          console.log(`Text deleted after ${duration} seconds.`);
        }, duration * 1000);
      } catch (error) {
        console.error("Error saving the text:", error);
        await interaction.reply({
          content: "There was an error processing the text. Please try again.",
          ephemeral: true,
        });
      }
    } else {
      await interaction.reply({
        content: "Please provide text to send.",
        ephemeral: true,
      });
    }
  },
};
