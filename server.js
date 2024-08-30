const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");

const app = express();
const port = 3000;

app.use(cors());

app.use(bodyParser.json());

const ID_FILE_PATH = path.join(__dirname, "latest_id.txt");

app.get("/api/test", (req, res) => {
  try {
    if (fs.existsSync(ID_FILE_PATH)) {
      const uniqueId = fs.readFileSync(ID_FILE_PATH, "utf8");
      res.status(200).json({ id: uniqueId });
    } else {
      res.status(404).json({ error: "No ID found." });
    }
  } catch (error) {
    console.error("Error fetching the ID:", error);
    res.status(500).json({ error: "Error fetching the ID." });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
