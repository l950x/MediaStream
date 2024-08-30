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

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mediasend")
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
          { name: "20 seconds", value: 20 }
        )
    ),

  async execute(client, interaction) {
    const media = interaction.options.getAttachment("media");
    let duration = interaction.options.getInteger("duration");

    if (!duration) {
      duration = 5;
    }

    if (media) {
      const fileExtension = path.extname(media.url).split("?")[0];
      const uniqueId = uuidv4();
      const filePath = path.join(
        __dirname,
        "../uploads",
        `latest_media_${uniqueId}${fileExtension}`
      );

      try {
        const response = await fetch(media.url);
        const buffer = await response.buffer();
        fs.writeFileSync(filePath, buffer);

        await interaction.reply({
          content: `Media received with ID: ${uniqueId} and will be displayed for ${duration} seconds on Streamlabs!`,
          files: [new AttachmentBuilder(filePath)],
        });

        if ([".png", ".jpg", ".jpeg"].includes(fileExtension)) {
          fs.writeFileSync(ID_FILE_PATH, uniqueId + "?" + fileExtension);
          setTimeout(() => {
            fs.unlinkSync(filePath);
            console.log(`Image deleted after ${duration} seconds.`);
          }, duration * 1000);
        } else if (fileExtension === ".mp4") {
          ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
              console.error("Error fetching video metadata:", err);
              return;
            }
            const videoDuration = metadata.format.duration;
            fs.writeFileSync(ID_FILE_PATH, uniqueId + "?vid=" + videoDuration);

            setTimeout(() => {
              fs.unlinkSync(filePath);
              fs.unlinkSync(ID_FILE_PATH);
              console.log(`Video deleted after ${videoDuration} seconds.`);
            }, videoDuration * 1000);
          });
        }
      } catch (error) {
        console.error("Error downloading or saving the media:", error);
        await interaction.reply({
          content: "There was an error processing the media. Please try again.",
          ephemeral: true,
        });
      }
    } else {
      await interaction.reply({
        content: "Please provide media to send.",
        ephemeral: true,
      });
    }
  },
};
