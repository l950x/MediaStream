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

const ID_FILE_PATH = path.join(__dirname, "../latest_id.txt");
const CHANNEL_ID = "1279736846045151293";

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
    const uniqueId = uuidv4();
    console.log("UniqueID: ", uniqueId);

    const ID_FILE_PATH = path.join(
      __dirname,
      "../public/assets/idfiles/latest_id_" + uniqueId + ".txt"
    );

    processQueue(client, interaction, ID_FILE_PATH, uniqueId);
  },
};

async function processQueue(client, interaction, ID_FILE_PATH, uniqueId) {
  try {
    const text = interaction.options.getString("text");
    let duration = interaction.options.getInteger("duration") || 5;

    if (text) {
      const firstEmbed = new EmbedBuilder()
        .setColor("#ff8000")
        .setTitle("Paname Boss")
        .setDescription(
          "Your text has been placed in the queue. Please wait while it is being processed."
        )
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
          .setDescription(`Text approved! It will now be processed.`)
          .setColor("#ff8000");

        await displayText(text, duration, interaction, null, embed, firstEmbed);
      } else {
        const embed = new EmbedBuilder()
          .setTitle("Text Validation")
          .setDescription(`Please approve or reject the text to be displayed.`)
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
          time: 30000,
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
              embed.setDescription(`Text approved! It will now be processed.`);
              embed.setColor("#ff8000");
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
              embed.setDescription(`Text rejected and will not be processed.`);
              await i.update({
                embeds: [embed],
                components: [],
              });
              firstEmbed.setDescription(`Text rejected.`);
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
            firstEmbed.setDescription(`Validation timed out.`);
            firstEmbed.setColor(0xff0000);
            interaction.editReply({
              embeds: [firstEmbed],
            });
            await interaction.editReply({
              content: "Validation timed out.",
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

    fs.writeFileSync(ID_FILE_PATH, JSON.stringify(data));
    firstEmbed.setDescription(`text approved and successfully processed.`);
    firstEmbed.setColor(0x00ff00);
    interaction.editReply({
      embeds: [firstEmbed],
    });

    setTimeout(() => {
      try {
        embed.setColor(0x00ff00);
        embed.setDescription(`Text approved and successfully processed.`);

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
