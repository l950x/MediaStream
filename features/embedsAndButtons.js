const { EmbedBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

async function embedsAndButtons({ uniqueId, text, duration, fileExtension }) {
  const embed = new EmbedBuilder()
    .setTitle("Media Validation")
    .setDescription("Please validate the media.")
    .addFields({ name: "Duration", value: `${duration} seconds` })
    .setColor(0xff0000);
  if (text) {
    embed.addFields({ name: "Text", value: text });
  }
  if (fileExtension) {
    embed.setImage(`attachment://latest_media_${uniqueId}${fileExtension}`);
  }
  const approveButton = new ButtonBuilder()
    .setCustomId(`approve_text_${uniqueId}`)
    .setLabel("Approve")
    .setStyle(ButtonStyle.Success);

  const rejectButton = new ButtonBuilder()
    .setCustomId(`reject_text_${uniqueId}`)
    .setLabel("Reject")
    .setStyle(ButtonStyle.Danger);

  return { embed, approveButton, rejectButton };
}

module.exports = embedsAndButtons;
