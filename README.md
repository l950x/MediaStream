
# Stream-Man [DiscordBot]



[![MIT License](https://img.shields.io/badge/node-js-purple)](https://github.com/nodejs/node)
[![MIT License](https://img.shields.io/badge/discord-js-purple)](https://github.com/discordjs/discord.js)
[![MIT License](https://img.shields.io/badge/html-purple)](https://github.com/discordjs/discord.js)
[![MIT License](https://img.shields.io/badge/css-purple)](https://github.com/discordjs/discord.js)
[![MIT License](https://img.shields.io/badge/javascript-purple)](https://github.com/discordjs/discord.js)


[Main Features](https://github.com/l950x/QPanel-discordbot-preview#mainfeatures) - [Overview](https://github.com/l950x/QPanel-discordbot-preview#overview) - [Installation](https://github.com/l950x/QPanel-discordbot-preview#installation) - [License](https://github.com/l950x/QPanel-discordbot-preview#license) - [Links](https://github.com/l950x/QPanel-discordbot-preview#links)




## 🛠️ Main Features

- /stream-text
- /stream-media
- /stream-mediatext
- /stream-tts | **NEW**
- /stream-tiktok | **[CURRENTLY NOT WORKING]**


## 📑Overview

<p align="center">
  <img src="./public/assets/gifs/cmd.gif" width="700"/>
</p>
<hr/>

Stream-Man is a Discord bot designed to display multimedia content (text, images, videos, audios) directly on a Streamlabs scene. Developed specifically for a client, it allows you to control your stream in real-time simply by interacting through Discord.

With Stream-Man, you can:

- **Display dynamic text:** Send messages that will instantly appear on your Streamlabs scene for your audience to see.
- **Share images:** Upload images from Discord and have them appear on your scene for a set duration.
- **Stream videos:** Play videos directly on your stream, choosing the duration they will be displayed.
- **Play audios:** Play audio files during your stream with adjustable timing and duration.
- **Preview media before streaming:** Verify images and videos before they are sent to your stream with an accept or reject button (optional).
  
This bot simplifies the management of your overlays and enhances the interactivity of your streams by centralizing all commands within Discord.
  
## ⚙️Installation

**1. Clone the Repository**
- Download the project using the following command:
```bash
git clone "https://github.com/l950x/stream-man.git"
```

**2. Install Dependencies**
- Navigate to the project directory and run:
```bash
npm install
```

**3. Configure the Bot Token**
- Open the .env file and replace the existing token with your bot's token:
```bash
DISCORD_TOKEN=your-bot-token-here
```

**4. Update the config.js File**
- Set the correct path for FFMPEG.
- Update adminIDs with the IDs of users who do not need to verify their media.
- Set verificationChannelID1 to the ID of the channel where verification requests will be sent.
- Set clientId to your bot's ID.
  
You can also customize the bot's messages in the config.js file.

**5. Run the Bot**
- Start the bot with the following command:
```bash
node .\index.js
```
You can now use the server's local IP as the URL in the browser source on Streamlabs / OBS.

## 📑Demo
<div align="center"></div>
<br/>
<div align="center">/stream-text</div>
<br/>
<p align="center">
<img src="./public/assets/gifs/text1-min.gif" width="700"/>
</p>
<hr/>

<div align="center">/stream-media | Image</div>
<br/>
<p align="center">
<img src="./public/assets/gifs/media1-min.gif" width="700"/>
</p>
<hr/>

<div align="center">/stream-media | Video</div>
<br/>
<p align="center">
<img src="./public/assets/gifs/media_video-min.gif" width="700"/>
</p>
<hr/>

<div align="center">/stream-mediatext | Image & text</div>
<br/>
<p align="center">
<img src="./public/assets/gifs/mediatext1-min.gif" width="700"/>
</p>
<hr/>


<div align="center">/stream-mediatext | Video & text</div>
<br/>
<p align="center">
<img src="./public/assets/gifs/mediatext video1-min.gif" width="700"/>
</p>
<hr/>

<div align="center">Media verif system</div>
<br/>
<p align="center">
<img src="./public/assets/gifs/verif1-min.gif" width="700"/>
</p>
<hr/>

<div align="center">Log system</div>
<br/>
<p align="center">
<img src="./public/assets/gifs/log.gif" width="700"/>
</p>
<hr/>

## 📃License

Released under the [GNU GPL v3](https://www.gnu.org/licenses/gpl-3.0.en.html)



## 🔗 Links
[![github](https://img.shields.io/badge/github-purple?style=for-the-badge&logo=github&logoColor=white)](https://github.com/l950x)

