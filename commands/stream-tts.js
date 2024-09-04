const { SlashCommandBuilder } = require("@discordjs/builders");
const {
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  ComponentType,
} = require("discord.js");

const { aiTts } = require("../features/callTTS");

const embedsAndButtons = require("../features/embedsAndButtons");
const ffmpeg = require("fluent-ffmpeg");

const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const adminCheck = require("../features/adminCheck");

const log = require("../features/log");
const txtLog = require("../features/txtLog");

const {
  FFMEPG_PATH,
  QUEUE_MESSAGE,
  APPROVE_MESSAGE_VALIDATION,
  APPROVE_MESSAGE,
  APPROVE_MESSAGE_USER,
  REJECT_MESSAGE,
  REJECT_MESSAGE_USER,
  VALIDATION_TIMED_OUT,
  STREAM_TTS_DESCRIPTION,
  STREAM_TTS_TEXT,
  BOT_NAME,
  verificationChannelID1,
  verificationChannelID2,
} = require("../config.json");

const CHANNEL_ID = verificationChannelID1;
ffmpeg.setFfmpegPath(FFMEPG_PATH);

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stream-tts")
    .setDescription(STREAM_TTS_DESCRIPTION)
    .addStringOption((option) =>
      option.setName("text").setDescription(STREAM_TTS_TEXT).setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("voice")
        .setDescription("The voice to use for TTS")
        .setRequired(true)
        .addChoices(
          { name: "Alloy", value: "alloy" },
          { name: "Echo", value: "echo" },
          { name: "Fable", value: "fable" },
          { name: "Onyx", value: "onyx" },
          { name: "Nova", value: "nova" },
          { name: "Shimmer", value: "shimmer" }
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
    const text = interaction.options.getString("text");
    const voice = interaction.options.getString("voice");
    const duration = 3;

    if (text) {
      const firstEmbed = new EmbedBuilder()
        .setColor("#ff8000")
        .setTitle(BOT_NAME)
        .setDescription(QUEUE_MESSAGE)
        .addFields({ name: "Text", value: text });
      await interaction.editReply({
        embeds: [firstEmbed],
      });
      log(
        `[+] Text message queued by ${interaction.user.username}: ${uniqueId}`,
        "green"
      );

      if (await adminCheck(interaction.member.id)) {
        log(
          `[+] User is an admin. Text will be processed directly: ${interaction.user.username}`,
          "blue"
        );

        try {
          await aiTts(text, voice, uniqueId);
        } catch (error) {
          console.error(error);
        }

        await sendAudio(
          interaction,
          null,
          null,
          firstEmbed,
          uniqueId,
          duration
        );
      } else {
        log(
          `[+] User is not an admin. Text will be sent for approval: ${interaction.user.username}`,
          "yellow"
        );
        const { embed, approveButton, rejectButton } = await embedsAndButtons({
          uniqueId,
          text,
          duration,
        });

        if (!embed || !approveButton || !rejectButton) {
          await interaction.editReply({
            content: "Failed to create the embed or buttons. Please try again.",
            ephemeral: true,
          });
          txtLog(
            "Failed to create embed or buttons during text approval process."
          );
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
        });

        const filter = (i) =>
          i.customId === `approve_text_${uniqueId}` ||
          i.customId === `reject_text_${uniqueId}`;

        const collector = message.createMessageComponentCollector({
          componentType: ComponentType.Button,
          filter,
          time: 60000,
        });

        collector.on("collect", async (i) => {
          log(
            `[+] Interaction collected: ${i.customId} by ${i.user.username}`,
            "green"
          );

          if (i.customId === `approve_text_${uniqueId}`) {
            await aiTts(text, voice, uniqueId);

            embed.setDescription(APPROVE_MESSAGE);
            embed.setColor(0xff8000);
            await i.update({
              embeds: [embed],
              components: [],
            });
            await sendAudio(
              interaction,
              i,
              embed,
              firstEmbed,
              uniqueId,
              duration
            );
          } else if (i.customId === `reject_text_${uniqueId}`) {
            log(`[+] Text rejected: ${uniqueId} by ${i.user.username}`, "red");
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
          }

          collector.stop();
        });

        collector.on("end", async (collected, reason) => {
          if (reason === "time") {
            log(`[!] Validation timed out for text: ${uniqueId}`, "yellow");
            firstEmbed.setColor(0xff0000);
            firstEmbed.setDescription(VALIDATION_TIMED_OUT);
            interaction.editReply({
              embeds: [firstEmbed],
            });
            embed.setDescription(VALIDATION_TIMED_OUT);
            embed.setColor(0xff0000);
            await message.edit({
              embeds: [embed],
              components: [],
            });
          }
        });
      }
    } else {
      log(
        `[!] No text provided by ${interaction.user.username}. Request aborted.`,
        "yellow"
      );
      await interaction.editReply({
        content: "Please provide text to send.",
        ephemeral: true,
      });
    }
  } catch (error) {
    txtLog("Error processing interaction: " + error);
    await interaction.editReply({
      content: "There was an error processing the text. Please try again.",
      ephemeral: true,
    });
  }
}

async function sendAudio(
  interaction,
  i,
  embed,
  firstEmbed,
  uniqueId,
  duration
) {
  try {
    const data = {
      id: uniqueId,
      type: "audio",
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
          components: [],
        });
      }
    } catch (error) {
      txtLog("Error approving the text:" + error);
    }
  }, duration * 1000);
}
