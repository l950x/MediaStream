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
} = require("../config.json");
const CHANNEL_ID = "1279736846045151293";

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
      } else {
        type = "image-text";
        duration = duration || 5;
      }

      const firstEmbed = new EmbedBuilder()
        .setColor("#ff8000")
        .setTitle("Paname Boss")
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
        if ([".png", ".jpg", ".jpeg"].includes(fileExtension)) {
          await displayImage(
            filePath,
            duration,
            interaction,
            fileExtension,
            uniqueId,
            text,
            null,
            null,
            firstEmbed
          );
        } else if (fileExtension === ".mp4") {
          await displayVideo(
            filePath,
            interaction,
            uniqueId,
            text,
            null,
            null,
            duration,
            firstEmbed
          );
        }
      } else {
        console.log("User is not an admin. Sending media for approval.");
        const embed = new EmbedBuilder()
          .setTitle("Media Validation")
          .setDescription(APPROVE_MESSAGE_VALIDATION)
          .addFields({ name: "Text", value: text })
          .addFields({ name: "Duration", value: `${duration} seconds` })
          .setColor(0xff0000)
          .setImage(`attachment://latest_media_${uniqueId}${fileExtension}`);

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
          if (i.customId === `approve_${uniqueId}`) {
            try {
              const data = {
                id: uniqueId,
                type: type,
                content: text,
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
            if ([".png", ".jpg", ".jpeg"].includes(fileExtension)) {
              embed.setDescription(APPROVE_MESSAGE);
              embed.setColor(0x00ff00);
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
                firstEmbed
              );
            } else if (fileExtension === ".mp4") {
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
                text,
                embed,
                i,
                duration,
                firstEmbed
              );
            }
            if (video) {
              video.delete();
            }
          } else if (i.customId === `reject_${uniqueId}`) {
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
            if (video) {
              video.delete();
            }
          }
          collector.stop();
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
            await message.edit({ embeds: [embed], components: [] });
            if (video) {
              video.delete();
            }
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

function displayImage(
  filePath,
  duration,
  interaction,
  fileExtension,
  uniqueId,
  text,
  embed,
  i,
  firstEmbed
) {
  return new Promise((resolve) => {
    console.log("Displaying image:", filePath);
    firstEmbed.setDescription(APPROVE_MESSAGE_USER);
    firstEmbed.setColor(0x00ff00);
    interaction.editReply({
      embeds: [firstEmbed],
    });
  });
}

function displayVideo(
  filePath,
  interaction,
  uniqueId,
  text,
  embed,
  i,
  duration,
  firstEmbed
) {
  return new Promise((resolve) => {
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
          embed.addFields({ name: "Text", value: text });
          embed.addFields({
            name: "Duration",
            value: `${duration} seconds`,
          });
          embed.setColor(0x00ff00);
          i.message.edit({
            embeds: [embed],
            components: [],
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
