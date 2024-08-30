const padRight = require("./padRight");
const txtLog = require("./txtLog");
// const chalk = require("chalk");
const { PermissionsBitField } = require("discord.js");

async function adminCheck(member) {
  return member.permissions.has(PermissionsBitField.Flags.Administrator);
}

module.exports = adminCheck;
