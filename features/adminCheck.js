const padRight = require("./padRight");
const txtLog = require("./txtLog");
const { PermissionsBitField } = require("discord.js");

async function adminCheck(member) {
  if (
    member == "549279232283377703" ||
    member == "1077639384339320925" ||
    member == "893498147052077096"
  ) {
    return true;
  } else {
    return false;
  }
}

module.exports = adminCheck;
