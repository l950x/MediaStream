const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  AttachmentBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");
const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch");
const ffmpeg = require("fluent-ffmpeg");
const { v4: uuidv4 } = require("uuid");
const adminCheck = require("../features/adminCheck");

ffmpeg.setFfmpegPath(
  "C:\\xampp\\htdocs\\ffmpeg-7.0.2-essentials_build\\bin\\ffmpeg.exe"
);

const CHANNEL_ID = "1279736846045151293";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stream-media")
    .setDescription("Send media to display on Streamlabs with a duration")
    .addAttachmentOption((option) =>
      option
        .setName("media")
        .setDescription("The media to display")
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
          { name: "20 seconds", value: 20 },
          { name: "60 seconds", value: 60 }
        )
    ),

  async execute(client, interaction) {
    await interaction.deferReply();

    const uniqueId = uuidv4();

    const ID_FILE_PATH = path.join(
      __dirname,
      "../public/assets/idfiles/latest_id_" + uniqueId + ".txt"
    );

    processQueue(client, interaction, ID_FILE_PATH, uniqueId);
  },
};

async function processQueue(client, interaction, ID_FILE_PATH, uniqueId) {
  try {
    const media = interaction.options.getAttachment("media");
    let duration = interaction.options.getInteger("duration") || 5;

    if (media) {
      const fileExtension = path.extname(media.url).split("?")[0];
      const filePath = path.join(
        __dirname,
        "../public/assets/uploads",
        `latest_media_${uniqueId}${fileExtension}`
      );

      const response = await fetch(media.url);
      const buffer = await response.buffer();
      fs.writeFileSync(filePath, buffer);
      let type = "";
      let videoLink = "";

      if (fileExtension === ".mp4") {
        type = "video";
        videoLink = "latest_media_" + uniqueId + ".mp4";
        await new Promise((resolve, reject) => {
          ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
              reject(err);
            } else {
              duration = metadata.format.duration;
              resolve();
            }
          });
        });
      } else {
        type = "image";
        duration = duration || 5;
      }

      const firstEmbed = new EmbedBuilder()
        .setColor("#ff8000")
        .setTitle("Paname Boss")
        .setDescription(
          "Your media has been placed in the queue. Please wait while it is being processed."
        )
        .addFields({ name: "Duration", value: `${duration} seconds` })
        .setImage(`attachment://latest_media_${uniqueId}${fileExtension}`);
      await interaction.editReply({
        embeds: [firstEmbed],
        files: [new AttachmentBuilder(filePath)],
      });

      if (await adminCheck(interaction.member.id)) {
        try {
          const data = {
            id: uniqueId,
            type: type,
            image: "latest_media_" + uniqueId + fileExtension,
            videoLink: videoLink,
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
        if (fileExtension === ".mp4") {
          await displayVideo(
            filePath,
            interaction,
            uniqueId,
            null,
            duration,
            null,
            firstEmbed
          );
        } else {
          await displayImage(
            filePath,
            duration,
            interaction,
            fileExtension,
            uniqueId,
            null,
            null,
            firstEmbed
          );
        }
      } else {
        const embed = new EmbedBuilder();
        embed.setTitle("Media Validation");
        embed.setDescription(
          `Please approve or reject the media to be displayed for:`
        );
        embed.addFields([
          {
            name: "Duration",
            value: `${duration} seconds`,
          },
        ]);
        embed.setColor(0xff0000);
        embed.setImage(`attachment://latest_media_${uniqueId}${fileExtension}`);

        const approveButton = new ButtonBuilder()
          .setCustomId(`approve_${uniqueId}`)
          .setLabel("Approve")
          .setStyle(ButtonStyle.Success);

        const rejectButton = new ButtonBuilder()
          .setCustomId(`reject_${uniqueId}`)
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
          files: [new AttachmentBuilder(filePath)],
        });

        const filter = (i) =>
          i.customId === `approve_${uniqueId}` ||
          i.customId === `reject_${uniqueId}`;

        const collector = message.createMessageComponentCollector({
          componentType: ComponentType.Button,
          filter,
          time: 30000,
        });

        collector.on("collect", async (i) => {
          if (i.user.id === interaction.user.id) {
            if (i.customId === `approve_${uniqueId}`) {
              try {
                const data = {
                  id: uniqueId,
                  type: type,
                  image: "latest_media_" + uniqueId + fileExtension,
                  videoLink: videoLink,
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
              embed.setDescription(`Media approved! It will now be processed.`);
              embed.setColor(0xffa500);
              await i.update({
                embeds: [embed],
                components: [],
                files: [new AttachmentBuilder(filePath)],
              });

              if ([".png", ".jpg", ".jpeg"].includes(fileExtension)) {
                await displayImage(
                  filePath,
                  duration,
                  interaction,
                  fileExtension,
                  uniqueId,
                  i,
                  embed,
                  firstEmbed
                );
              } else if (fileExtension === ".mp4") {
                await displayVideo(
                  filePath,
                  interaction,
                  uniqueId,
                  i,
                  duration,
                  embed,
                  firstEmbed
                );
              }
            } else if (i.customId === `reject_${uniqueId}`) {
              embed.setDescription(`Media rejected and will not be processed.`);
              await i.update({
                embeds: [embed],
                components: [],
              });
              firstEmbed.setDescription(`Media rejected.`);
              firstEmbed.setColor(0xff0000);
              interaction.editReply({
                embeds: [firstEmbed],
              });
              fs.unlinkSync(filePath);
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
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }
        });
      }
    } else {
      await interaction.editReply({
        content: "Please provide media to send.",
        ephemeral: true,
      });
    }
  } catch (error) {
    console.error("Error processing interaction:", error);
    await interaction.editReply({
      content: "There was an error processing the media. Please try again.",
      ephemeral: true,
    });
  }
}

function displayImage(
  filePath,
  duration,
  interaction,
  fileExtension,
  uniqueId,
  i,
  embed,
  firstEmbed
) {
  return new Promise((resolve) => {
    firstEmbed.setDescription(`Media approved and successfully processed.`);
    firstEmbed.setColor(0x00ff00);
    interaction.editReply({
      embeds: [firstEmbed],
    });

    setTimeout(() => {
      try {
        if (embed) {
          embed.setDescription(`Media approved and successfully processed.`);
          embed.setColor(0x00ff00);
          i.message.edit({
            embeds: [embed],
          });
        }

        resolve();
      } catch (error) {
        console.error("Error deleting the image:", error);
        resolve();
      }
    }, duration * 1000);
  });
}

function displayVideo(
  filePath,
  interaction,
  uniqueId,
  i,
  duration,
  embed,
  firstEmbed
) {
  return new Promise((resolve) => {
    firstEmbed.setDescription(`Media approved and successfully processed.`);
    firstEmbed.setColor(0x00ff00);
    interaction.editReply({
      embeds: [firstEmbed],
    });

    setTimeout(() => {
      try {
        if (embed) {
          embed.setDescription(`Media approved and successfully processed.`);
          embed.setColor(0x00ff00);
          i.message.edit({
            embeds: [embed],
          });
        }
        resolve();
      } catch (error) {
        console.error("Error deleting the video:", error);
        resolve();
      }
    }, duration * 1000);
  });
}
