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

ffmpeg.setFfmpegPath(path.join(__dirname, "../ffmpeg/bin/ffmpeg.exe"));

const {
  QUEUE_MESSAGE,
  APPROVE_MESSAGE_VALIDATION,
  APPROVE_MESSAGE,
  APPROVE_MESSAGE_USER,
  REJECT_MESSAGE,
  REJECT_MESSAGE_USER,
  VALIDATION_TIMED_OUT,
  STREAM_MEDIATEXT_DESCRIPTION,
  STREAM_MEDIATEXT_MEDIA,
  STREAM_MEDIATEXT_TEXT,
  STREAM_MEDIATEXT_DURATION,
  BOT_NAME,
  verificationChannelID1,
  verificationChannelID2,
} = require("../config.json");
const CHANNEL_ID = verificationChannelID1;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stream-mediatext")
    .setDescription(STREAM_MEDIATEXT_DESCRIPTION)
    .addAttachmentOption((option) =>
      option
        .setName("media")
        .setDescription(STREAM_MEDIATEXT_MEDIA)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("text")
        .setDescription(STREAM_MEDIATEXT_TEXT)
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("duration")
        .setDescription(STREAM_MEDIATEXT_DURATION)
        .addChoices(
          { name: "5 seconds", value: 5 },
          { name: "10 seconds", value: 10 },
          { name: "15 seconds", value: 15 },
          { name: "20 seconds", value: 20 },
          { name: "60 seconds", value: 60 }
        )
    ),

  async execute(client, interaction) {
    try {
      await interaction.deferReply();

      const uniqueId = uuidv4();

      if (!interaction.guild) {
        console.log("Interaction was not in a guild.");
        await interaction.editReply({
          content: "This command cannot be used in this context (e.g., DMs).",
          components: [],
          ephemeral: true,
        });
        return;
      }

      processQueue(client, interaction, uniqueId);
    } catch (error) {
      console.error("Error in execute function:", error);
      const errorEmbed = new EmbedBuilder()
        .setColor("#ff0000")
        .setTitle("Error")
        .setDescription("An error occurred while processing your request.")
        .setTimestamp();
      interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};

async function processQueue(client, interaction, uniqueId) {
  try {
    const media = interaction.options.getAttachment("media");
    let duration = interaction.options.getInteger("duration");
    const text = interaction.options.getString("text");

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
      let type = "";
      let videoLink = "";
      fs.writeFileSync(filePath, buffer);

      if (fileExtension === ".mp4") {
        type = "image-video";
        videoLink = "latest_media_" + uniqueId + ".mp4";

        try {
          duration = await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(filePath, (err, metadata) => {
              if (err) {
                console.error("ffprobe error:", err);
                reject(err);
              } else {
                resolve(metadata.format.duration);
              }
            });
          });
        } catch (error) {
          console.error("Error while fetching video duration:", error);
          await interaction.editReply({
            content:
              "An error occurred while processing the video. Please try again.",
            ephemeral: true,
          });
          fs.unlinkSync(filePath);
          return;
        }
      } else if (fileExtension === ".gif") {
        type = "gif-text";
        duration = duration || 5;
      } else {
        type = "image-text";
        duration = duration || 5;
      }

      const firstEmbed = new EmbedBuilder()
        .setColor("#ff8000")
        .setTitle(BOT_NAME)
        .setDescription(QUEUE_MESSAGE)
        .addFields({ name: "Text", value: text })
        .addFields({ name: "Duration", value: `${duration} seconds` })
        .setImage(`attachment://latest_media_${uniqueId}${fileExtension}`);
      await interaction.editReply({
        embeds: [firstEmbed],
        files: [new AttachmentBuilder(filePath)],
      });

      if (await adminCheck(interaction.member.id)) {
        console.log("User is an admin. Processing media directly.");
        if (type === "image-video") {
          await displayVideo(
            filePath,
            interaction,
            uniqueId,
            text,
            null,
            null,
            duration,
            firstEmbed,
            type,
            videoLink,
            fileExtension
          );
        } else {
          await displayImage(
            filePath,
            duration,
            interaction,
            fileExtension,
            uniqueId,
            text,
            null,
            null,
            firstEmbed,
            type
          );
        }
      } else {
        console.log("User is not an admin. Sending media for approval.");
        const { embed, approveButton, rejectButton } = await embedsAndButtons({
          uniqueId,
          text,
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
        if (type === "image-video") {
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
            if (type === "image-text") {
              embed.setDescription(APPROVE_MESSAGE);
              embed.setColor(0xff8000);
              await i.update({
                embeds: [embed],
                components: [],
                files: [new AttachmentBuilder(filePath)],
              });
              await displayImage(
                filePath,
                duration,
                interaction,
                fileExtension,
                uniqueId,
                text,
                embed,
                i,
                firstEmbed,
                type
              );
            } else {
              await displayVideo(
                filePath,
                interaction,
                uniqueId,
                text,
                embed,
                i,
                duration,
                firstEmbed,
                type,
                videoLink,
                fileExtension
              );
            }
          } else if (i.customId === `reject_text_${uniqueId}`) {
            await i.update({
              content: "Media rejected and will not be processed.",
              components: [],
            });
            firstEmbed.setDescription(REJECT_MESSAGE_USER);
            firstEmbed.setColor(0xff0000);
            interaction.editReply({
              embeds: [firstEmbed],
            });
            embed.setDescription(REJECT_MESSAGE);
            embed.setColor(0xff0000);
            await message.edit({ embeds: [embed], components: [] });
            fs.unlinkSync(filePath);
          }
          collector.stop();
        });

        collector.on("end", async (collected, reason) => {
          try {
            if (video) {
              await video.delete();
            }
          } catch (error) {
            console.error("Error deleting video:", error);
          }
          if (reason === "time") {
            firstEmbed.setDescription(VALIDATION_TIMED_OUT);
            firstEmbed.setColor(0xff0000);
            interaction.editReply({
              embeds: [firstEmbed],
            });
            embed.setDescription(VALIDATION_TIMED_OUT);
            embed.setColor(0xff0000);
            await message.edit({ embeds: [embed], components: [] });
          }
        });
      }
    } else {
      console.log("No media provided.");
      await interaction.editReply({
        content: "Please provide media to send.",
        ephemeral: true,
      });
    }
  } catch (error) {
    console.error("Error processing interaction:", error);
    const errorEmbed = new EmbedBuilder()
      .setColor("#ff0000")
      .setTitle("Error")
      .setDescription("An error occurred while processing your request.")
      .setTimestamp();
    interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
  }
}

async function displayImage(
  filePath,
  duration,
  interaction,
  fileExtension,
  uniqueId,
  text,
  embed,
  i,
  firstEmbed,
  type
) {
  try {
    const data = {
      id: uniqueId,
      type: type,
      content: text,
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

  console.log("Displaying image:", filePath);
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
          components: [],
        });
      }
    } catch (error) {
      console.error("Error deleting the image:", error);
    }
  }, duration * 1000);
}

async function displayVideo(
  filePath,
  interaction,
  uniqueId,
  text,
  embed,
  i,
  duration,
  firstEmbed,
  type,
  videoLink,
  fileExtension
) {
  try {
    const data = {
      id: uniqueId,
      type: type,
      content: text,
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
  console.log("Displaying video:", filePath);
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
          components: [],
        });
      }
    } catch (error) {
      console.error("Error deleting the image:", error);
    }
  }, duration * 1000);
}
