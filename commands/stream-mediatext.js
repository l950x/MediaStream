const { SlashCommandBuilder } = require("@discordjs/builders");
const { AttachmentBuilder } = require("discord.js");
const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch");
const ffmpeg = require("fluent-ffmpeg");
const { v4: uuidv4 } = require("uuid");

ffmpeg.setFfmpegPath(
  "C:\\xampp\\htdocs\\ffmpeg-7.0.2-essentials_build\\bin\\ffmpeg.exe"
);

const ID_FILE_PATH = path.join(__dirname, "../latest_id.txt");

let interactionQueue = [];
let isProcessing = false;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stream-mediatext")
    .setDescription("Send media to display on Streamlabs with a duration")
    .addAttachmentOption((option) =>
      option
        .setName("media")
        .setDescription("The media to display")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("text")
        .setDescription("The text to display")
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
      processQueue();
    }
  },
};

async function processQueue() {
  isProcessing = true;

  while (interactionQueue.length > 0) {
    const interaction = interactionQueue.shift();

    try {
      const media = interaction.options.getAttachment("media");
      let duration = interaction.options.getInteger("duration") || 5;
      const text = interaction.options.getString("text");

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

        await interaction.editReply({
          content: `Media received with ID: ${uniqueId} and will be displayed for ${duration} seconds on Streamlabs!`,
          files: [new AttachmentBuilder(filePath)],
        });

        if ([".png", ".jpg", ".jpeg"].includes(fileExtension)) {
          await displayImage(
            filePath,
            duration,
            interaction,
            fileExtension,
            uniqueId,
            text
          );
        } else if (fileExtension === ".mp4") {
          await displayVideo(filePath, interaction, uniqueId, text);
        }
      } else {
        await interaction.editReply({
          content: "Please provide media to send.",
          ephemeral: true,
        });
      }
    } catch (error) {
      console.error("Error processing interaction:", error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.editReply({
          content: "There was an error processing the media. Please try again.",
          ephemeral: true,
        });
      }
    }
  }

  isProcessing = false;
}

function displayImage(
  filePath,
  duration,
  interaction,
  fileExtension,
  uniqueId,
  text
) {
  return new Promise((resolve) => {

    const data = {
      type: "image-text",
      content: text,
      image: "latest_media_" + uniqueId + fileExtension,
      duration: duration,
    };

    fs.writeFileSync(ID_FILE_PATH, JSON.stringify(data));

    setTimeout(() => {
      try {
        fs.unlinkSync(filePath);
        fs.unlinkSync(ID_FILE_PATH);
        resolve();
      } catch (error) {
        console.error("Error deleting the image:", error);
        resolve();
      }
    }, duration * 1000);
  });
}

function displayVideo(filePath, interaction, uniqueId, text) {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error("Error fetching video metadata:", err);
        resolve();
        return;
      }
      const videoDuration = metadata.format.duration;

      const data = {
        type: "image-video",
        content: text,
        videoLink: "latest_media_" + uniqueId + ".mp4",
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
