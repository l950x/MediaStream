const fs = require("fs").promises;
const path = require("path");
const OpenAI = require("openai");
require("dotenv").config();
const openai = new OpenAI(process.env.OPENAI_API_KEY);

async function aiTts(input, voice, uniqueId) {
    try {
        const speechFile = path.resolve(__dirname,"../public/assets/uploads/latest_media_" + uniqueId + ".mp3");
        const requestData = {
            model: "tts-1-hd",
            voice: voice,
            input: input,
            
        };

        const response = await openai.audio.speech.create(requestData);
        const buffer = Buffer.from(await response.arrayBuffer());
        await fs.writeFile(speechFile, buffer);
    } catch (error) {
        console.error(error);
    }
}
module.exports = { aiTts };
