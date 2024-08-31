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

ffmpeg.setFfmpegPath(
  "C:\\xampp\\htdocs\\ffmpeg-7.0.2-essentials_build\\bin\\ffmpeg.exe"
);

const ID_FILE_PATH = path.join(__dirname, "../latest_id.txt");
const CHANNEL_ID = "1147116498079461466";

let interactionQueue = [];
let isProcessing = false;

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

    interactionQueue.push(interaction);

    await interaction.editReply({
      content:
        "Your media has been placed in the queue. Please wait while it is being processed.",
    });

    if (!isProcessing) {
      processQueue(client);
    }
  },
};

async function processQueue(client) {
  if (isProcessing) return;
  isProcessing = true;

  while (interactionQueue.length > 0) {
    const interaction = interactionQueue.shift();

    try {
      const media = interaction.options.getAttachment("media");
      let duration = interaction.options.getInteger("duration") || 5;

      if (media) {
        const fileExtension = path.extname(media.url).split("?")[0];
        const uniqueId = uuidv4();
        const filePath = path.join(
          __dirname,
          "../uploads",
          `latest_media_${uniqueId}${fileExtension}`
        );

        const response = await fetch(media.url);
        const buffer = await response.buffer();
        fs.writeFileSync(filePath, buffer);

        const embed = new EmbedBuilder()
          .setTitle("Media Validation")
          .setDescription(
            `Please approve or reject the media to be displayed for ${duration} seconds.`
          )
          .setColor(0x00ff00)
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
          content: "Media received. Please approve or reject.",
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
              await i.update({
                content: "Media approved! It will now be processed.",
                components: [],
              });

              if ([".png", ".jpg", ".jpeg"].includes(fileExtension)) {
                await displayImage(
                  filePath,
                  duration,
                  interaction,
                  fileExtension,
                  uniqueId
                );
              } else if (fileExtension === ".mp4") {
                await displayVideo(filePath, interaction, uniqueId);
              }
            } else if (i.customId === `reject_${uniqueId}`) {
              await i.update({
                content: "Media rejected and will not be processed.",
                components: [],
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
            await interaction.editReply({
              content: "Validation timed out.",
              components: [],
            });
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          }

          isProcessing = false;
          processQueue(client);
        });
      } else {
        await interaction.editReply({
          content: "Please provide media to send.",
          ephemeral: true,
        });
        isProcessing = false;
        processQueue(client);
      }
    } catch (error) {
      console.error("Error processing interaction:", error);
      await interaction.editReply({
        content: "There was an error processing the media. Please try again.",
        ephemeral: true,
      });
      isProcessing = false;
      processQueue(client);
    }
  }

  isProcessing = false;
}

function displayImage(
  filePath,
  duration,
  interaction,
  fileExtension,
  uniqueId
) {
  return new Promise((resolve) => {
    const data = {
      type: "image",
      image: "latest_media_" + uniqueId + fileExtension,
      duration: duration,
    };

    fs.writeFileSync(ID_FILE_PATH, JSON.stringify(data));

    setTimeout(() => {
      try {
        fs.unlinkSync(filePath);
        if (fs.existsSync(ID_FILE_PATH)) {
          fs.unlinkSync(ID_FILE_PATH);
        }
        resolve();
      } catch (error) {
        console.error("Error deleting the image:", error);
        resolve();
      }
    }, duration * 1000);
  });
}

function displayVideo(filePath, interaction, uniqueId) {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error("Error fetching video metadata:", err);
        resolve();
        return;
      }
      const videoDuration = metadata.format.duration + 1;

      const data = {
        type: "video",
        content: "latest_media_" + uniqueId + ".mp4",
        duration: videoDuration,
      };

      fs.writeFileSync(ID_FILE_PATH, JSON.stringify(data));

      setTimeout(() => {
        try {
          fs.unlinkSync(filePath);
          fs.unlinkSync(ID_FILE_PATH);
          console.log(`Video deleted after ${videoDuration} seconds.`);
          resolve();
        } catch (error) {
          console.error("Error deleting the video:", error);
          resolve();
        }
      }, videoDuration * 1000);
    });
  });
}
