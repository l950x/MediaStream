const { SlashCommandBuilder } = require("@discordjs/builders");
const { EmbedBuilder } = require("discord.js");
const path = require("path");
const fs = require("fs");

const ID_FILE_PATH = path.join(__dirname, "../latest_id.txt");

let textInteractionQueue = [];
let isTextProcessing = false;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stream-text")
    .setDescription("Send text to display on Streamlabs with a duration")
    .addStringOption((option) =>
      option
        .setName("text")
        .setDescription("The text to display")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("duration")
        .setDescription("Duration to display the text (seconds)")
        .addChoices(
          { name: "5 seconds", value: 5 },
          { name: "10 seconds", value: 10 },
          { name: "15 seconds", value: 15 },
          { name: "20 seconds", value: 20 }
        )
    ),

  async execute(client, interaction) {
    await interaction.deferReply();

    textInteractionQueue.push(interaction);

    await interaction.editReply({
      content:
        "Your text has been placed in the queue. Please wait while it is being processed.",
    });

    if (!isTextProcessing) {
      processTextQueue();
    }
  },
};

function processTextQueue() {
  isTextProcessing = true;

  if (textInteractionQueue.length > 0) {
    const interaction = textInteractionQueue.shift();

    try {
      const text = interaction.options.getString("text");
      let duration = interaction.options.getInteger("duration") || 5;

      if (text) {
        interaction.editReply({
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

        const data = {
          type: "text",
          content: text,
          duration: duration,
        };

        fs.writeFileSync(ID_FILE_PATH, JSON.stringify(data));

        setTimeout(() => {
          try {
            fs.unlinkSync(ID_FILE_PATH);
            console.log(`Text deleted after ${duration} seconds.`);
          } catch (error) {
            console.error("Error deleting the text:", error);
          }

          processTextQueue();
        }, duration * 1000);
      } else {
        interaction.editReply({
          content: "Please provide text to send.",
          ephemeral: true,
        });

        processTextQueue();
      }
    } catch (error) {
      console.error("Error processing interaction:", error);
      if (!interaction.replied && !interaction.deferred) {
        interaction.editReply({
          content: "There was an error processing the text. Please try again.",
          ephemeral: true,
        });
      }

      processTextQueue();
    }
  } else {
    isTextProcessing = false;
  }
}
