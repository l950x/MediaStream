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
const embedsAndButtons = require("../features/embedsAndButtons");

const {
  FFMEPG_PATH,
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
  BOT_NAME,
  verificationChannelID1,
  verificationChannelID2,
} = require("../config.json");
ffmpeg.setFfmpegPath(FFMEPG_PATH);
const CHANNEL_ID = verificationChannelID1;

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
      if (![".png", ".jpg", ".jpeg", ".gif", ".mp4"].includes(fileExtension)) {
        await interaction.editReply({
          content: "Invalid file type. Please upload an image, video, or GIF.",
          ephemeral: true,
        });
        return;
      }
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
        .setTitle(BOT_NAME)
        .setDescription(QUEUE_MESSAGE)
        .addFields({ name: "Duration", value: `${duration} seconds` })
        .setImage(`attachment://latest_media_${uniqueId}${fileExtension}`);
      await interaction.editReply({
        embeds: [firstEmbed],
        files: [new AttachmentBuilder(filePath)],
      });

      if (await adminCheck(interaction.member.id)) {
        if (type === "video") {
          await displayVideo(
            interaction,
            uniqueId,
            null,
            duration,
            null,
            firstEmbed,
            type,
            videoLink
          );
        } else {
          await displayImage(
            duration,
            interaction,
            fileExtension,
            uniqueId,
            null,
            null,
            firstEmbed,
            type
          );
        }
      } else {
        const { embed, approveButton, rejectButton } = await embedsAndButtons({
          uniqueId,
          text: null,
          duration,
          fileExtension,
        });

        if (!embed || !approveButton || !rejectButton) {
          await interaction.editReply({
            content: "Failed to create the embed or buttons. Please try again.",
            ephemeral: true,
          });
          return;
        }

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
        if (type === "video") {
          video = await channel.send({
            files: [new AttachmentBuilder(filePath)],
          });
        }

        const filter = (i) =>
          i.customId === `approve_text_${uniqueId}` ||
          i.customId === `reject_text_${uniqueId}`;

        const collector = message.createMessageComponentCollector({
          componentType: ComponentType.Button,
          filter,
          time: 30000,
        });

        collector.on("collect", async (i) => {
          if (i.customId === `approve_text_${uniqueId}`) {
            embed.setDescription(APPROVE_MESSAGE);
            embed.setColor(0xff8000);

            await i.update({
              embeds: [embed],
              components: [],
              files: [new AttachmentBuilder(filePath)],
            });

            if (type === "image") {
              await displayImage(
                duration,
                interaction,
                fileExtension,
                uniqueId,
                i,
                embed,
                firstEmbed,
                type
              );
            } else {
              await displayVideo(
                interaction,
                uniqueId,
                i,
                duration,
                embed,
                firstEmbed,
                type,
                videoLink
              );
            }
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
            fs.unlinkSync(filePath);
          }

          collector.stop();
        });

        collector.on("end", async (collected, reason) => {
          if (video) {
            try {
              await video.delete();
            } catch (error) {
              console.error("Error deleting video:", error);
            }
          }
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

async function displayImage(
  duration,
  interaction,
  fileExtension,
  uniqueId,
  i,
  embed,
  firstEmbed,
  type
) {
  try {
    const data = {
      id: uniqueId,
      type: type,
      image: "latest_media_" + uniqueId + fileExtension,
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
    } catch (error) {
      console.error("Error deleting the image:", error);
    }
  }, duration * 1000);
}

async function displayVideo(
  interaction,
  uniqueId,
  i,
  duration,
  embed,
  firstEmbed,
  type,
  videoLink
) {
  try {
    const data = {
      id: uniqueId,
      type: type,
      image: "latest_media_" + uniqueId + ".mp4",
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
    } catch (error) {
      console.error("Error deleting the video:", error);
    }
  }, duration * 1000);
}
