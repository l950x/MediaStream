const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const ID_FILE_PATH = path.join(__dirname, "../latest_id.txt");
const CHANNEL_ID = '1147116498079461466';

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
      processTextQueue(client);
    }
  },
};

async function processTextQueue(client) {
  if (isTextProcessing) return;
  isTextProcessing = true;

  while (textInteractionQueue.length > 0) {
    const interaction = textInteractionQueue.shift();
    const uniqueId = uuidv4();

    try {
      const text = interaction.options.getString("text");
      let duration = interaction.options.getInteger("duration") || 5;

      if (text) {
        const embed = new EmbedBuilder()
          .setTitle("Text Validation")
          .setDescription(
            `Please approve or reject the text to be displayed for ${duration} seconds.`
          )
          .setColor(0x00ff00)
          .addFields({ name: "Text", value: text });

        const approveButton = new ButtonBuilder()
          .setCustomId(`approve_text_${uniqueId}`)
          .setLabel("Approve")
          .setStyle(ButtonStyle.Success);

        const rejectButton = new ButtonBuilder()
          .setCustomId(`reject_text_${uniqueId}`)
          .setLabel("Reject")
          .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(
          approveButton,
          rejectButton
        );

        const channel = await client.channels.fetch(CHANNEL_ID);
        
        const message = await channel.send({
          content: "Text received. Please approve or reject.",
          embeds: [embed],
          components: [row],
        });

        const filter = (i) =>
          i.customId === `approve_text_${uniqueId}` ||
          i.customId === `reject_text_${uniqueId}`;

        const collector = message.createMessageComponentCollector({
          componentType: ComponentType.Button,
          filter,
          time: 30000,
        });

        collector.on("collect", async (i) => {
          if (i.user.id === interaction.user.id) {
            if (i.customId === `approve_text_${uniqueId}`) {
              await i.update({
                content: "Text approved! It will now be processed.",
                embeds: [embed],
                components: [],
              });

              await displayText(text, duration, interaction);
            } else if (i.customId === `reject_text_${uniqueId}`) {
              await i.update({
                content: "Text rejected and will not be processed.",
                embeds: [embed],
                components: [],
              });
            }

            collector.stop();
          } else {
            await i.reply({
              content: "These buttons aren't for you!",
              ephemeral: true,
            });
          }
        });

        collector.on("end", async (collected, reason) => {
          if (reason === "time") {
            await message.edit({
              content: "Validation timed out.",
              components: [],
            });
          }

          isTextProcessing = false;
          processTextQueue(client);
        });
      } else {
        await interaction.editReply({
          content: "Please provide text to send.",
          ephemeral: true,
        });
        isTextProcessing = false;
        processTextQueue(client);
      }
    } catch (error) {
      console.error("Error processing interaction:", error);
      await interaction.editReply({
        content: "There was an error processing the text. Please try again.",
        ephemeral: true,
      });
      isTextProcessing = false;
      processTextQueue(client);
    }
  }

  isTextProcessing = false;
}

function displayText(text, duration, interaction) {
  return new Promise((resolve) => {
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
        resolve();
      } catch (error) {
        console.error("Error deleting the text:", error);
        resolve();
      }
    }, duration * 1000);
  });
}
