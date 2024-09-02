const padRight = require("./padRight");
const txtLog = require("./txtLog");
const { PermissionsBitField } = require("discord.js");
const { AdminID } = require("../config.json");

async function adminCheck(member) {
  return AdminID.includes(member.toString()) ? true : false;
}

module.exports = adminCheck;
