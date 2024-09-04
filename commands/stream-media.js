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
const log = require("../features/log");
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
const txtLog = require("../features/txtLog");
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
    log(
      `[+] Media queued by ${interaction.user.username}: ${uniqueId}`,
      "green"
    );
    processQueue(client, interaction, uniqueId);
  },
};

async function processQueue(client, interaction, uniqueId) {
  try {
    const media = interaction.options.getAttachment("media");
    let duration = interaction.options.getInteger("duration");

    if (media) {
      const fileExtension = path.extname(media.url).split("?")[0].toLowerCase();
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

      try {
        const response = await fetch(media.url);
        if (!response.ok) throw new Error("Failed to fetch media.");
        const buffer = await response.buffer();
        fs.writeFileSync(filePath, buffer);
        log(`[+] Media downloaded successfully: ${filePath}`, "green");
      } catch (error) {
        txtLog(error);
        await interaction.editReply({
          content: "Failed to download the media. Please try again.",
          ephemeral: true,
        });
        return;
      }

      let type = "";
      let videoLink = "";
      if (fileExtension === ".mp4") {
        type = "video";
        videoLink = `latest_media_${uniqueId}.mp4`;
        try {
          await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(filePath, (err, metadata) => {
              if (err) {
                reject(err);
                log(
                  `[!] Error processing video: ${err} | Dit you add the FFMEPG_PATH in config.json ?`,
                  "red"
                );
              } else {
                duration = duration || metadata.format.duration;
                resolve();
              }
            });
          });
          log(`[+] Video metadata retrieved for ${filePath}`, "green");
        } catch (error) {
          txtLog(error);
          await interaction.editReply({
            content: "Failed to process the video. Please try again.",
            ephemeral: true,
          });
          return;
        }
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
        log(
          `[+] Admin detected: ${interaction.user.username}. Media approved automatically.`,
          "blue"
        );
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
        log(
          `[+] Non-admin user: ${interaction.user.username}. Awaiting approval.`,
          "yellow"
        );
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
            log(
              `[+] Media approved by ${i.user.username}: ${uniqueId}`,
              "green"
            );
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
            log(`[+] Media rejected by ${i.user.username}: ${uniqueId}`, "red");
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
              txtLog(error);
            }
          }
          if (reason === "time") {
            log(`[!] Validation timed out for media: ${uniqueId}`, "yellow");
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
    txtLog(error);
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
      log("[+] ID successfully sent to the API", "green");
    } else {
      txtLog("Failed to send ID to the API");
    }
  } catch (error) {
    txtLog("Error sending ID to the API:" + error);
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
      txtLog("Error deleting the image:" + error);
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
      log("[+] ID successfully sent to the API", "green");
    } else {
      txtLog("Failed to send ID to the API");
    }
  } catch (error) {
    txtLog("Error sending ID to the API:" + error);
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
      txtLog("Error deleting the video:" + error);
    }
  }, duration * 1000);
}
