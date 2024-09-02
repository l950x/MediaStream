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
const dt = require("downloadTiktok");
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB limit

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

ffmpeg.setFfmpegPath(path.join(__dirname, "../ffmpeg/bin/ffmpeg.exe"));

const CHANNEL_ID = "1280128849534783570";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stream-tiktok")
    .setDescription(STREAM_MEDIA_DESCRIPTION)
    .addStringOption((option) =>
      option.setName("tiktok_url").setDescription("TikTok URL")
    )
    .addIntegerOption((option) =>
      option
        .setName("duration")
        .setDescription(STREAM_MEDIA_DESCRIPTION_DURATION)
        .setRequired(false)
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
    if (!(await adminCheck(interaction.member.id))) {
      return await interaction.reply(
        "You do not have permission to use this command."
      );
    }

    const uniqueId = uuidv4();

    processQueue(client, interaction, uniqueId);
  },
};

async function processQueue(client, interaction, uniqueId) {
  try {
    let fileExtension = null;
    let duration = interaction.options.getInteger("duration") || null;
    const tiktok_url = interaction.options.getString("tiktok_url") || null;
    let originalFileName = "";

    if (tiktok_url) {
      const videoUrl = await downloadTikTokVideo(tiktok_url);
      if (videoUrl) {
        media = { url: videoUrl };
        const response = await fetch(videoUrl);
        originalFileName = `latest_media_${uniqueId}.mp4`;
      } else {
        await interaction.editReply({
          content:
            "Failed to download the TikTok video. Please check the URL and try again.",
          ephemeral: true,
        });
        return;
      }
      fileExtension = ".mp4";

      // if (!fileExtension) {
      //   fileExtension = originalFileName.split(".").pop();
      // }
      const filePath = path.join(
        __dirname,
        "../public/assets/uploads",
        originalFileName
      );

      const response = await fetch(media.url);
      const buffer = await response.buffer();
      fs.writeFileSync(filePath, buffer);

      if (buffer.length > MAX_FILE_SIZE) {
        console.log("File is too large, compressing...");

        const tempFilePath = path.join(
          __dirname,
          "../public/assets/uploads",
          `temp_${uniqueId}.mp4`
        );

        // Compress the video using FFmpeg and save it to a temporary path
        await new Promise((resolve, reject) => {
          ffmpeg(filePath)
            .outputOptions("-vf", "scale=640:-1") // Scale video to reduce size
            .output(tempFilePath)
            .on("end", resolve)
            .on("error", reject)
            .run();
        });

        // Replace the original file with the compressed version
        console.log("Unlinking original file:", filePath);
        fs.unlinkSync(filePath); // Delete the original large file
        fs.renameSync(tempFilePath, filePath); // Rename the temp file to the original file name
        console.log("File compressed and saved as:", originalFileName);
        media.url = filePath; // Update media URL to the compressed file path
      }

      let type = "";
      let videoLink = "";

      type = "video";
      videoLink = originalFileName;
      await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(media.url, (err, metadata) => {
          if (err) {
            reject(err);
          } else {
            duration = metadata.format.duration;
            resolve();
          }
        });
      });

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
        video = await channel.send({
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
              embed.setDescription(APPROVE_MESSAGE);
              embed.setColor(0x00ff00);

              await i.update({
                embeds: [embed],
                components: [],
                files: [new AttachmentBuilder(filePath)],
              });

              await displayVideo(
                filePath,
                interaction,
                uniqueId,
                i,
                duration,
                embed,
                firstEmbed
              );
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
              //   console.log('Video deleted: ' + filePath);
              //   fs.unlinkSync(filePath);
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
            video.delete();
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

async function downloadTikTokVideo(tiktokUrl) {
  try {
    const result = await dt.downloadTiktok(tiktokUrl);

    const noWatermarkVideos = dt.filterNoWatermark(result.medias);

    const bestVideo = dt.getBestMediaWithinLimit(
      noWatermarkVideos,
      50 * 1024 * 1024
    );

    if (bestVideo) {
      return bestVideo.url;
    } else {
      console.error("Failed to get a suitable TikTok video.");
      return null;
    }
  } catch (error) {
    console.error("Error downloading TikTok video:", error);
    return null;
  }
}
