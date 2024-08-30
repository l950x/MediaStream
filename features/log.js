const padRight = require("./padRight");
const txtLog = require("./txtLog");
const chalk = import("chalk");

async function log(message, color) {
    console.log(
        chalk[color](padRight(message, 9))
    );
    txtLog(message)

}

module.exports = log;
