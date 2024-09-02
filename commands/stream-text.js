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
const adminCheck = require("../features/adminCheck");

const {
  QUEUE_MESSAGE,
  APPROVE_MESSAGE_VALIDATION,
  APPROVE_MESSAGE,
  APPROVE_MESSAGE_USER,
  REJECT_MESSAGE,
  REJECT_MESSAGE_USER,
  VALIDATION_TIMED_OUT,
  STREAM_TEXT_DESCRIPTION,
  STREAM_TEXT_TEXT,
  STREAM_TEXT_DURATION,
} = require("../config.json");

const CHANNEL_ID = "1279736846045151293";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stream-text")
    .setDescription(STREAM_TEXT_DESCRIPTION)
    .addStringOption((option) =>
      option.setName("text").setDescription(STREAM_TEXT_TEXT).setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("duration")
        .setDescription(STREAM_TEXT_DURATION)
        .addChoices(
          { name: "5 seconds", value: 5 },
          { name: "10 seconds", value: 10 },
          { name: "15 seconds", value: 15 },
          { name: "20 seconds", value: 20 }
        )
    ),

  async execute(client, interaction) {
    await interaction.deferReply();
    const uniqueId = uuidv4();
    processQueue(client, interaction, uniqueId);
  },
};

async function processQueue(client, interaction, uniqueId) {
  try {
    const text = interaction.options.getString("text");
    let duration = interaction.options.getInteger("duration") || 5;

    if (text) {
      const firstEmbed = new EmbedBuilder()
        .setColor("#ff8000")
        .setTitle("Paname Boss")
        .setDescription(QUEUE_MESSAGE)
        .addFields({ name: "Text", value: text })
        .addFields({ name: "Duration", value: `${duration} seconds` });
      await interaction.editReply({
        embeds: [firstEmbed],
      });

      if (await adminCheck(interaction.member.id)) {
        try {
          const data = {
            id: uniqueId,
            type: "text",
            content: text,
            duration: duration,
          };
          const response = await fetch("http://localhost:3000/api/update-id", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
          });

          if (response.ok) {
            console.log("ID successfully sent to the API");
          } else {
            console.error("Failed to send ID to the API");
          }
        } catch (error) {
          console.error("Error sending ID to the API:", error);
        }
        const embed = new EmbedBuilder()
          .setDescription(APPROVE_MESSAGE)
          .setColor(0x00ff00);

        await displayText(text, duration, interaction, null, embed, firstEmbed);
      } else {
        const embed = new EmbedBuilder()
          .setTitle("Text Validation")
          .setDescription(APPROVE_MESSAGE_VALIDATION)
          .setColor(0xff0000)
          .addFields({ name: "Text", value: text })
          .addFields({ name: "Duration", value: `${duration} seconds` });

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
          embeds: [embed],
          components: [row],
        });

        const filter = (i) =>
          i.customId === `approve_text_${uniqueId}` ||
          i.customId === `reject_text_${uniqueId}`;

        const collector = message.createMessageComponentCollector({
          componentType: ComponentType.Button,
          filter,
          time: 60000,
        });

        collector.on("collect", async (i) => {
          if (i.user.id === interaction.user.id) {
            if (i.customId === `approve_text_${uniqueId}`) {
              try {
                const data = {
                  id: uniqueId,
                  type: "text",
                  content: text,
                  duration: duration,
                };
                const response = await fetch(
                  "http://localhost:3000/api/update-id",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify(data),
                  }
                );

                if (response.ok) {
                  console.log("ID successfully sent to the API");
                } else {
                  console.error("Failed to send ID to the API");
                }
              } catch (error) {
                console.error("Error sending ID to the API:", error);
              }
              embed.setDescription(APPROVE_MESSAGE);
              embed.setColor(0x00ff00);
              await i.update({
                embeds: [embed],
                components: [],
              });

              await displayText(
                text,
                duration,
                interaction,
                i,
                embed,
                firstEmbed
              );
            } else if (i.customId === `reject_text_${uniqueId}`) {
              embed.setDescription(REJECT_MESSAGE);
              await i.update({
                embeds: [embed],
                components: [],
              });
              firstEmbed.setDescription(REJECT_MESSAGE_USER);
              firstEmbed.setColor(0xff0000);
              interaction.editReply({
                embeds: [firstEmbed],
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
            firstEmbed.setColor(0xff0000);
            firstEmbed.setDescription(VALIDATION_TIMED_OUT);
            interaction.editReply({
              embeds: [firstEmbed],
            });
            embed.setDescription(VALIDATION_TIMED_OUT);
            embed.setColor(0xff0000);
            await message.edit({
              embeds: [embed],
              components: [],
            });
          }
        });
      }
    } else {
      await interaction.editReply({
        content: "Please provide text to send.",
        ephemeral: true,
      });
    }
  } catch (error) {
    console.error("Error processing interaction:", error);
    await interaction.editReply({
      content: "There was an error processing the text. Please try again.",
      ephemeral: true,
    });
  }
}

function displayText(text, duration, interaction, i, embed, firstEmbed) {
  return new Promise((resolve) => {
    const data = {
      type: "text",
      content: text,
      duration: duration,
    };

    firstEmbed.setDescription(APPROVE_MESSAGE_USER);
    firstEmbed.setColor(0x00ff00);
    interaction.editReply({
      embeds: [firstEmbed],
    });

    setTimeout(() => {
      try {
        embed.setColor(0x00ff00);
        embed.setDescription(APPROVE_MESSAGE_USER);

        if (i && i.message) {
          i.message.edit({
            embeds: [embed],
            components: [],
          });
        }
        resolve();
      } catch (error) {
        console.error("Error deleting the text:", error);
        resolve();
      }
    }, duration * 1000);
  });
}
