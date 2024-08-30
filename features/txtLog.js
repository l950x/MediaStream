const fs = require("fs").promises;
const path = require("path");
const padRight = require("./padRight");

async function txtLog(message) {
  const logMessage = `[${new Date().toLocaleString()}] ${message}\n`;
  const logDir = "logs";
  const logFileName = `log-${getFormattedDate()}.txt`;
  const logFilePath = path.join(logDir, logFileName);

  try {
    await fs.mkdir(logDir, { recursive: true });
    await fs.appendFile(logFilePath, logMessage);
  } catch (err) {
    console.error("Error:", err);
  }
}

function getFormattedDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

module.exports = txtLog;
