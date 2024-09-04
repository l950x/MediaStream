const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const app = express();
const port = 3000;
const log = require("./features/log");
const txtLog = require("./features/txtLog");

app.use(cors());
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, "public")));

const ID_FILES_DIR = path.join(__dirname, "./public/assets/idfiles");
const { PYTHON_PATH } = require("./config.json");
function getLatestFile() {
  const files = fs.readdirSync(ID_FILES_DIR);

  const idFiles = files.filter(
    (file) => file.startsWith("latest_id_") && file.endsWith(".txt")
  );

  if (idFiles.length === 0) {
    return null;
  }

  idFiles.sort((a, b) => {
    const aTime = fs.statSync(path.join(ID_FILES_DIR, a)).mtime;
    const bTime = fs.statSync(path.join(ID_FILES_DIR, b)).mtime;
    return bTime - aTime;
  });

  return idFiles[0];
}

app.get("/api/test", (req, res) => {
  try {
    const latestFile = getLatestFile();

    if (latestFile) {
      const fileContent = fs.readFileSync(
        path.join(ID_FILES_DIR, latestFile),
        "utf8"
      );
      const data = JSON.parse(fileContent);
      res.status(200).json(data);
      log("[+] Fetched latest media data successfully", "green");
    } else {
      res.status(404).json({ error: "No media file found." });
    }
  } catch (error) {
    txtLog(error);
    res.status(500).json({ error: "Error fetching the media data." });
  }
});

app.post("/api/update-id", (req, res) => {
  try {
    const data = req.body;

    if (data && data.id) {
      const ID_FILE_PATH = path.join(ID_FILES_DIR, `latest_id_${data.id}.txt`);

      fs.writeFileSync(ID_FILE_PATH, JSON.stringify(data));
      res.status(200).json({ success: true });
      log(`[+] Updated ID file: ${ID_FILE_PATH}`, "green");
    } else {
      res.status(400).json({ error: "Invalid ID data." });
      log("[!] Invalid ID data received.", "yellow");
    }
  } catch (error) {
    txtLog(error);
    res.status(500).json({ error: "Error updating the ID." });
  }
});

app.delete("/api/delete-file", (req, res) => {
  const fileName = req.query.name;
  log(`[/] File deletion request received: ${fileName}`, "green");

  const filePath = path.join(__dirname, "./public/assets/idfiles", fileName);

  fs.unlink(filePath, (err) => {
    if (err) {
      txtLog(err);
      return res.status(500).json({
        success: false,
        message: "Erreur lors de la suppression du fichier.",
        error: err,
      });
    }
    log(`[+] File deleted successfully: ${fileName}`, "green");
    res
      .status(200)
      .json({ success: true, message: "Fichier supprimé avec succès." });
  });
});

app.post("/api/execute-audio", (req, res) => {
  const data = req.body;
  const id = data.id;
  log(`[+] Audio data received: ${data.id}`, "green");
  const scriptPath = path.join(__dirname, "./py/sendAudio.py " + id);

  exec(`${PYTHON_PATH} ${scriptPath}`, (error, stdout, stderr) => {
    if (error) {
      txtLog(error);
      return res.status(500).json({
        success: false,
        message: "Error executing the Python script.",
        error: stderr,
      });
    }
    log("[+] Python script executed successfully.", "green");
    res.status(200).json({
      success: true,
      message: "Python script executed successfully.",
      output: stdout,
    });
  });
});

app.listen(port, () => {
  setTimeout(() => {
    log(`[^] Server started at http://localhost:${port}`, "magenta");
  }, 3000);
});
