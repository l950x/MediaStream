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
      if (data) {
        const { type, content, duration, image, videoLink } = data;
        console.log(`Type: ${type}`);
        console.log(`Content: ${content}`);
        console.log(`Duration: ${duration}`);

        const durationInMs = duration * 1000 - 1000;
        handleMediaDisplay(type, content, image, videoLink, durationInMs);
        mediaFetched = true;
      }
    } else {
      console.error("Failed to fetch media.");
    }
  } catch (error) {
    console.error("Error fetching media:", error);
  }
}

function handleMediaDisplay(type, content, image, videoLink, durationInMs) {
  switch (type) {
    case "text":
      displayText(content, durationInMs);
      break;
    case "image":
      displayImage(image, durationInMs);
      break;
    case "video":
      displayVideo(content, durationInMs);
      break;
    case "image-text":
      displayImageText(content, image, durationInMs);
      break;
    case "image-video":
      displayImageVideo(content, videoLink, durationInMs);
      break;
    default:
      console.error("Unknown media type.");
  }
}

function displayText(content, durationInMs) {
  console.log("Displaying text");
  text.innerHTML = content;
  text.style.display = "block";
  video.style.display = "none";
  img.style.display = "none";

  setTimeout(() => {
    console.log("Timer finished, starting text animation.");
    text.classList.add("animstop");
  }, durationInMs);
}

function displayImage(image, durationInMs) {
  console.log("Displaying image");
  src = `/uploads/${image}`;
  img.src = src;
  img.style.display = "block";
  video.style.display = "none";
  text.style.display = "none";

  setTimeout(() => {
    console.log("Timer finished, starting image animation.");
    img.classList.add("animstop");
  }, durationInMs);
}

function displayVideo(content, durationInMs) {
  console.log("Displaying video");
  src = `/uploads/${content}`;
  video.src = src;
  video.style.display = "block";
  img.style.display = "none";
  text.style.display = "none";
  video.volume = 0.25;

  setTimeout(() => {
    console.log("Timer finished, starting video animation.");
    video.classList.add("animstop");
  }, durationInMs);
}

function displayImageText(content, image, durationInMs) {
  console.log("Displaying image and text");
  img.src = `/uploads/${image}`;
  text.innerHTML = content;
  text.style.marginTop = "40%";
  img.style.display = "block";
  video.style.display = "none";
  text.style.display = "block";

  setTimeout(() => {
    console.log("Timer finished, starting image-text animation.");
    img.classList.add("animstop");
    text.classList.add("animstop");
  }, durationInMs);
}

function displayImageVideo(content, videoLink, durationInMs) {
  console.log("Displaying image and video");
  video.src = `/uploads/${videoLink}`;
  text.innerHTML = content;
  text.style.marginTop = "40%";
  img.style.display = "none";
  video.style.display = "block";
  text.style.display = "block";
  video.volume = 0.25;

  setTimeout(() => {
    console.log("Timer finished, starting image-video animation.");
    video.classList.add("animstop");
    text.classList.add("animstop");
  }, durationInMs);
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
