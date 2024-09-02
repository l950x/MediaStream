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

const {
  QUEUE_MESSAGE,
  APPROVE_MESSAGE_VALIDATION,
  APPROVE_MESSAGE,
  APPROVE_MESSAGE_USER,
  REJECT_MESSAGE,
  REJECT_MESSAGE_USER,
  VALIDATION_TIMED_OUT,
  STREAM_MEDIA_DESCRIPTION,
  STREAM_MEDIA_DESCRIPTION_MEDIA,
  STREAM_MEDIA_DESCRIPTION_DURATION,
} = require("../config.json");

ffmpeg.setFfmpegPath(
  "C:\\xampp\\htdocs\\ffmpeg-7.0.2-essentials_build\\bin\\ffmpeg.exe"
);

const CHANNEL_ID = "1280128849534783570";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stream-media")
    .setDescription(STREAM_MEDIA_DESCRIPTION)
    .addAttachmentOption((option) =>
      option
        .setName("media")
        .setDescription(STREAM_MEDIA_DESCRIPTION_MEDIA)
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("duration")
        .setDescription(STREAM_MEDIA_DESCRIPTION_DURATION)
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

    processQueue(client, interaction, uniqueId);
  },
};

async function processQueue(client, interaction, uniqueId) {
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
      } else if (fileExtension === ".gif") {
        type = "gif";
        duration = duration || 5;
      } else {
        type = "image";
        duration = duration || 5;
      }

      const firstEmbed = new EmbedBuilder()
        .setColor("#ff8000")
        .setTitle("Paname Boss")
        .setDescription(QUEUE_MESSAGE)
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
        embed.setDescription(APPROVE_MESSAGE_VALIDATION);
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

        let video = null;
        if (fileExtension === ".mp4") {
          video = await channel.send({
            files: [new AttachmentBuilder(filePath)],
          });
        }

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
              embed.setDescription(APPROVE_MESSAGE);
              embed.setColor(0x00ff00);

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
              if (video) {
                video.delete();
              }
            } else if (i.customId === `reject_${uniqueId}`) {
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
              fs.unlinkSync(filePath);
              if (video) {
                video.delete();
              }
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
            firstEmbed.setDescription(VALIDATION_TIMED_OUT);
            firstEmbed.setColor(0xff0000);
            interaction.editReply({
              embeds: [firstEmbed],
            });
            embed.setDescription(VALIDATION_TIMED_OUT);
            embed.setColor(0xff0000);
            message.edit({
              embeds: [embed],
              components: [],
            });
            if (video) {
              video.delete();
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
    firstEmbed.setDescription(APPROVE_MESSAGE_USER);
    firstEmbed.setColor(0x00ff00);
    interaction.editReply({
      embeds: [firstEmbed],
    });

    setTimeout(() => {
      try {
        if (embed) {
          embed.setDescription(APPROVE_MESSAGE_USER);
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
    firstEmbed.setDescription(APPROVE_MESSAGE_USER);
    firstEmbed.setColor(0x00ff00);
    interaction.editReply({
      embeds: [firstEmbed],
    });

    setTimeout(() => {
      try {
        if (embed) {
          embed.setDescription(APPROVE_MESSAGE_USER);
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
