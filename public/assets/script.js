let src = null;
const video = document.getElementById("video");
const img = document.getElementById("img");
const text = document.getElementById("text");
let mediaFetched = false;
let isFetching = false;
async function fetchMedia() {
  if (isFetching || mediaFetched) return;

  isFetching = true;

  try {
    const response = await fetch("http://localhost:3000/api/test");
    if (response.ok) {
      const data = await response.json();
      if (data) {
        mediaFetched = true;
        const id = data.id;
        const type = data.type;
        const content = data.content;
        const image = data.image;
        const duration = data.duration;
        const videoLink = data.videoLink;

        const durationInMs = duration * 1000;
        handleMediaDisplay(type, content, image, videoLink, durationInMs, id);
      }
    } else {
      console.error("Failed to fetch media.");
    }
  } catch (error) {
    console.error("Error fetching media:", error);
  } finally {
    isFetching = false;
  }
}

function handleMediaDisplay(type, content, image, videoLink, durationInMs, id) {
  switch (type) {
    case "text":
      displayText(content, durationInMs, id);
      break;
    case "image":
      displayImage(image, durationInMs, id);
      break;
    case "video":
      displayVideo(content, durationInMs, id, videoLink);
      break;
    case "image-text":
      displayImageText(content, image, durationInMs, id);
      break;
    case "image-video":
      displayVideoText(content, videoLink, durationInMs, id);
      break;
    case "gif":
      displayGif(image, durationInMs, id);
      break;
    case "gif-text":
      displayGifText(image, content, durationInMs, id);
    case "audio":
      displayAudio(id, durationInMs);
      break;
    default:
      console.error("Unknown media type.");
  }
}

function displayText(content, durationInMs, id) {
  console.log("Displaying text");

  const textElement = document.createElement("p");
  textElement.id = "text";
  textElement.classList.add("anim");
  textElement.innerHTML = content;

  document.body.appendChild(textElement);
  setTimeout(() => {
    textElement.classList.add("float");
  }, 400);

  setTimeout(() => {
    console.log("Timer finished, starting text animation.");
    textElement.classList.add("animstop");

    const animationDuration = 1000;
    setTimeout(() => {
      console.log("Removing text element from the DOM.");
      textElement.remove();
      const fileName = `latest_id_${id}.txt`;
      fetch(`http://localhost:3000/api/delete-file?name=${fileName}`, {
        method: "DELETE",
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            console.log("File deleted successfully.");
            mediaFetched = false;
          } else {
            console.log("Error deleting file.");
          }
        });
    }, animationDuration);
  }, durationInMs);
}

function displayImage(image, durationInMs, id) {
  console.log("Displaying image");

  const imageElement = document.createElement("img");
  imageElement.id = "img";
  imageElement.classList.add("anim");
  imageElement.src = `../assets/uploads/${image}`;

  document.body.appendChild(imageElement);

  setTimeout(() => {
    imageElement.classList.add("float");
  }, 400);

  setTimeout(() => {
    console.log("Timer finished, starting image animation.");
    imageElement.classList.add("animstop");

    const animationDuration = 1000;
    setTimeout(() => {
      console.log("Removing image element from the DOM.");
      imageElement.remove();
      const fileName = `latest_id_${id}.txt`;
      fetch(`http://localhost:3000/api/delete-file?name=${fileName}`, {
        method: "DELETE",
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            console.log("File deleted successfully.");
            mediaFetched = false;
          } else {
            console.log("Error deleting file.");
          }
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    }, animationDuration);
  }, durationInMs);
}

function displayVideo(content, durationInMs, id, videoLink) {
  console.log("Displaying video");

  const videoElement = document.createElement("video");
  videoElement.id = "video";
  videoElement.classList.add("anim");
  videoElement.src = `../assets/uploads/${videoLink}`;
  videoElement.volume = 0.25;

  videoElement.autoplay = true;

  document.body.appendChild(videoElement);
  setTimeout(() => {
    videoElement.classList.add("float");
  }, 400);

  setTimeout(() => {
    console.log("Timer finished, starting video animation.");
    videoElement.classList.add("animstop");

    const animationDuration = 1000;
    setTimeout(() => {
      console.log("Removing video element from the DOM.");
      videoElement.remove();
      const fileName = `latest_id_${id}.txt`;
      fetch(`http://localhost:3000/api/delete-file?name=${fileName}`, {
        method: "DELETE",
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            console.log("File deleted successfully.");
            mediaFetched = false;
          } else {
            console.log("Error deleting file.");
          }
        });
    }, animationDuration);
  }, durationInMs);
}

function displayImageText(content, image, durationInMs, id) {
  console.log("Displaying image and text");

  const mediaContainer = document.createElement("div");
  const textElement = document.createElement("p");
  const imageElement = document.createElement("img");

  mediaContainer.id = "media-container";
  textElement.id = "text";
  imageElement.id = "img";
  textElement.classList.add("textAnim");
  imageElement.classList.add("anim");

  imageElement.src = `../assets/uploads/${image}`;
  textElement.innerHTML = content;

  mediaContainer.appendChild(imageElement);
  mediaContainer.appendChild(textElement);
  document.body.appendChild(mediaContainer);
  setTimeout(() => {
    imageElement.classList.add("float");
    textElement.classList.add("float");
  }, 400);

  textElement.style.marginTop = "40%";

  setTimeout(() => {
    console.log("Timer finished, starting image-text animation.");

    imageElement.classList.add("animstop");
    textElement.classList.add("animstop");

    const animationDuration = 1000;
    setTimeout(() => {
      console.log("Removing image and text elements from the DOM.");
      mediaContainer.remove();

      const fileName = `latest_id_${id}.txt`;
      fetch(`http://localhost:3000/api/delete-file?name=${fileName}`, {
        method: "DELETE",
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            console.log("File deleted successfully.");
            mediaFetched = false;
          } else {
            console.log("Error deleting file.");
          }
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    }, animationDuration);
  }, durationInMs);
}

function displayVideoText(content, videoLink, durationInMs, id) {
  console.log("Displaying image and video");

  const mediaContainer = document.createElement("div");
  const videoElement = document.createElement("video");
  const textElement = document.createElement("p");

  mediaContainer.id = "media-container";
  textElement.id = "text";
  videoElement.id = "video";
  textElement.classList.add("anim");
  videoElement.classList.add("anim");

  videoElement.src = `../assets/uploads/${videoLink}`;
  videoElement.volume = 0.25;

  videoElement.autoplay = true;

  textElement.innerHTML = content;

  mediaContainer.appendChild(videoElement);
  mediaContainer.appendChild(textElement);
  document.body.appendChild(mediaContainer);
  setTimeout(() => {
    videoElement.classList.add("float");
    textElement.classList.add("float");
  }, 400);

  textElement.style.marginTop = "40%";

  setTimeout(() => {
    console.log("Timer finished, starting image-video animation.");
    videoElement.classList.add("animstop");
    textElement.classList.add("animstop");

    const animationDuration = 1000;
    setTimeout(() => {
      console.log("Removing image and video elements from the DOM.");
      mediaContainer.remove();
      const fileName = `latest_id_${id}.txt`;
      fetch(`http://localhost:3000/api/delete-file?name=${fileName}`, {
        method: "DELETE",
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            console.log("File deleted successfully.");
            mediaFetched = false;
          } else {
            console.log("Error deleting file.");
          }
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    }, animationDuration);
  }, durationInMs);
}

function displayGif(image, durationInMs, id) {
  console.log("Displaying gif");
  const mediaContainer = document.createElement("div");
  const gifElement = document.createElement("img");
  mediaContainer.id = "media-container";
  gifElement.id = "gif";
  gifElement.classList.add("anim");
  gifElement.src = `../assets/uploads/${image}`;
  mediaContainer.appendChild(gifElement);
  document.body.appendChild(mediaContainer);

  setTimeout(() => {
    gifElement.classList.add("float");
  }, 400);
  setTimeout(() => {
    console.log("Timer finished, starting gif animation.");
    gifElement.classList.add("animstop");
    const animationDuration = 1000;
    setTimeout(() => {
      console.log("Removing gif and text elements from the DOM.");
      mediaContainer.remove();
      const fileName = `latest_id_${id}.txt`;
      fetch(`http://localhost:3000/api/delete-file?name=${fileName}`, {
        method: "DELETE",
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            console.log("File deleted successfully.");
            mediaFetched = false;
          } else {
            console.log("Error deleting file.");
          }
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    }, animationDuration);
  }, durationInMs);
}

function displayGifText(image, content, durationInMs, id) {
  console.log("Displaying gif and text");
  const mediaContainer = document.createElement("div");
  const gifElement = document.createElement("img");
  const textElement = document.createElement("p");
  mediaContainer.id = "media-container";
  gifElement.id = "gif";
  textElement.id = "text";
  gifElement.classList.add("anim");
  textElement.classList.add("anim");
  textElement.style.marginTop = "40%";
  gifElement.src = `../assets/uploads/${image}`;
  textElement.innerHTML = content;
  mediaContainer.appendChild(gifElement);
  mediaContainer.appendChild(textElement);
  document.body.appendChild(mediaContainer);
  setTimeout(() => {
    gifElement.classList.add("float");
    textElement.classList.add("float");
  }, 400);
  setTimeout(() => {
    console.log("Timer finished, starting gif and text animation.");
    gifElement.classList.add("animstop");
    textElement.classList.add("animstop");
    const animationDuration = 1000;
    setTimeout(() => {
      console.log("Removing gif and text elements from the DOM.");
      mediaContainer.remove();
      const fileName = `latest_id_${id}.txt`;
      fetch(`http://localhost:3000/api/delete-file?name=${fileName}`, {
        method: "DELETE",
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            console.log("File deleted successfully.");
            mediaFetched = false;
          } else {
            console.log("Error deleting file.");
          }
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    }, animationDuration);
  }, durationInMs);
}
function checkAndFetchMedia() {
  if (!mediaFetched) {
    console.log("Fetching media...");
    fetchMedia();
  }
  setTimeout(checkAndFetchMedia, 1000);
}

function displayAudio(id, durationInMs) {
  const mediaContainer = document.createElement("div");
  mediaContainer.id = "media-container";
  document.body.appendChild(mediaContainer);
  const textElement = document.createElement("p");
  textElement.id = "text";
  textElement.classList.add("anim");
  textElement.style.marginTop = "40%";
  textElement.innerHTML = "[AUDIO]";
  mediaContainer.appendChild(textElement);

  setTimeout(() => {
    textElement.classList.add("float");
  }, 400);

  console.log("Displaying audio");

  fetch("http://localhost:3000/api/execute-audio", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: id }),
  })
    .then((response) => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error("Failed to execute Python script");
      }
    })
    .then((data) => {
      console.log(data.message || "Python script executed successfully.");
    })
    .catch((error) => {
      console.error("Error:", error.message);
    });

  setTimeout(() => {
    console.log("Timer finished, starting gif and text animation.");
    textElement.classList.add("animstop");
    const animationDuration = 1000;
    setTimeout(() => {
      console.log("Removing gif and text elements from the DOM.");
      mediaContainer.remove();
      const fileName = `latest_id_${id}.txt`;
      fetch(`http://localhost:3000/api/delete-file?name=${fileName}`, {
        method: "DELETE",
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            console.log("File deleted successfully.");
            mediaFetched = false;
          } else {
            console.log("Error deleting file.");
          }
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    }, animationDuration);
  }, durationInMs);
}
checkAndFetchMedia();
