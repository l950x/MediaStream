// index.js
const { Client, Collection } = require("discord.js");
const log = require("./features/log");
const figlet = require("figlet");
const client = new Client({
  intents: [8],
});
require("dotenv").config();
const token = process.env.DISCORD_TOKEN;
const LoadCommands = require("./Loaders/LoadCommands");
const padToCenter = require("./features/padToCenter");
const chalk = require("chalk");
client.commands = new Collection();
const padRight = require("./features/padRight");
const txtLog = require("./features/txtLog");
LoadCommands()
  .then(() => {
    padToCenter("Command loaded".split("\n"), process.stdout.columns).then(
      (centeredText) => {
        console.log(chalk.green(centeredText));
      }
    );
    client.on("interactionCreate", (interaction) => {
      if (!interaction.isCommand()) return;
      // log(
      //   `[+] ${interaction.user.tag} in #${interaction.channel.name} --> /${interaction.commandName}`,
      //   "magenta"
      // );
      try {
        require(`./commands/${interaction.commandName}`);
      } catch (error) {
        txtLog(error);
        if (error.code === "MODULE_NOT_FOUND") {
          interaction.reply({
            content: "Command not found, try /help",
            ephemeral: true,
          });
          return;
        }
        throw error;
      }

      require(`./commands/${interaction.commandName}`).execute(
        client,
        interaction
      );
    });

    dateTime = new Date().toLocaleString("en-US", {
      hour12: false,
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    client.on("ready", () => {
      client.user.setActivity("l.950 on top");
    });

    client.login(token);
  })
  .catch((error) => {
    console.error("Error while deploying commands:", error);
  });

require("./server");
