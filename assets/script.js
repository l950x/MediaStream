let src = null;
const video = document.getElementById("video");
const img = document.getElementById("img");
const text = document.getElementById("text");
let mediaFetched = false;

async function fetchMedia() {
  try {
    const response = await fetch("http://localhost:3000/api/test");
    if (response.ok) {
      const data = await response.json();
      if (data.id) {
        const id = data.id.split("?")[0];
        const param = data.id.split("?")[1];
        console.log(param);
        if (param.includes("text")) {
          console.log("text");
          text.innerHTML = id.split("?")[0];
          text.style.display = "block";
          video.style.display = "none";
          img.style.display = "none";
        } else if (param.includes("both")) {
          console.log("both");
          const [textContent, extension] = param.split("=")[1].split(".");
          src = "/uploads/latest_media_" + id + "." + extension;
          img.src = src;
          text.innerHTML = textContent;
          text.style.marginTop = "30%";
          img.style.display = "block";
          video.style.display = "none";
          text.style.display = "block";
        } else if (!param.includes("vid")) {
          console.log("img");
          src = "/uploads/latest_media_" + id + param;
          img.src = src;
          img.style.display = "block";
          video.style.display = "none";
          text.style.display = "none";
        } else {
          console.log("vid");
          duration = param.split("=")[1];
          console.log("duration: " + duration);
          src = "/uploads/latest_media_" + id + ".mp4";
          video.src = src;
          video.style.display = "block";
          img.style.display = "none";
          text.style.display = "none";
          video.volume = 0.25;
          const durationInMs = duration * 1000 - 1000;
          console.log("durationInMs: " + durationInMs);

          setTimeout(() => {
            console.log("Timer finished, starting animation.");
            video.classList.add("animstop");
          }, durationInMs);
        }
        mediaFetched = true;
      }
    } else {
      console.error("Failed to fetch media.");
    }
  } catch (error) {
    console.error("Error fetching media:", error);
  }
}

function startFetching() {
  const interval = setInterval(() => {
    if (mediaFetched) {
      clearInterval(interval);
    } else {
      fetchMedia();
    }
  }, 1000);
}

startFetching();
