const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, "public")));

const ID_FILES_DIR = path.join(__dirname, "./public/assets/idfiles");

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
    } else {
      res.status(404).json({ error: "No media file found." });
    }
  } catch (error) {
    console.error("Error fetching the media data:", error);
    res.status(500).json({ error: "Error fetching the media data." });
  }
});

app.post("/api/update-id", (req, res) => {
  try {
    const data = req.body;
    console.log(data);

    if (data && data.id) {
      const ID_FILE_PATH = path.join(ID_FILES_DIR, `latest_id_${data.id}.txt`);

      fs.writeFileSync(ID_FILE_PATH, JSON.stringify(data));
      res.status(200).json({ success: true });
    } else {
      res.status(400).json({ error: "Invalid ID data." });
    }
  } catch (error) {
    console.error("Error updating the ID:", error);
    res.status(500).json({ error: "Error updating the ID." });
  }
});

app.delete("/api/delete-file", (req, res) => {
  const fileName = req.query.name;
  const filePath = path.join(__dirname, "./public/assets/idfiles", fileName);

  fs.unlink(filePath, (err) => {
    if (err) {
      console.log(err);
      return res.status(500).json({
        success: false,
        message: "Erreur lors de la suppression du fichier.",
        error: err,
      });
    }
    res
      .status(200)
      .json({ success: true, message: "Fichier supprimé avec succès." });
  });
});

app.listen(port, () => {
  // console.log(`Serveur lancé sur http://localhost:${port}`);
});
