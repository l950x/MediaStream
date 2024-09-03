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
      setTimeout(() => {
        figlet.text(
          `READY -> ${dateTime}`,
          {
            font: "mini",
          },
          function (err, data) {
            if (err) {
              console.log("Something went wrong...");
              console.dir(err);
              return;
            }

            padToCenter(data.split("\n"), process.stdout.columns).then(
              (centeredText) => {
                console.log(chalk.green(centeredText));
              }
            );
            padToCenter(
              "[+] ---------------------------------------------------------------------------------------------- [+]".split(
                "\n"
              ),
              process.stdout.columns
            ).then((centeredHr) => {
              console.log(chalk.gray(centeredHr + "\n\n"));
            });
          }
        );
        client.user.setActivity("/help");
      }, 1000);
    });

    client.login(token);
  })
  .catch((error) => {
    console.error("Error while deploying commands:", error);
  });

require("./server");
