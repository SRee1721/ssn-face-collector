/*navigator.mediaDevices
  .getUserMedia({ video: true })
  .then((stream) => {
    document.getElementById("video").srcObject = stream;
  })
  .catch((err) => {
    console.error("Camera access error:", err);
  });*/

/*let stream;
let name, role;
let sample = 0;

document.getElementById("infoForm").addEventListener("submit", function (e) {
  e.preventDefault();
  name = document.getElementById("name").value;
  role = document.getElementById("role").value;
  alert("Info submitted. Click 'Start Capturing Faces'");
});

document
  .getElementById("startCapture")
  .addEventListener("click", async function () {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    document.getElementById("video").srcObject = stream;

    const canvas = document.getElementById("canvas");
    const context = canvas.getContext("2d");

    const interval = setInterval(async () => {
      if (sample >= 50) {
        // Send 50 samples max
        clearInterval(interval);
        stream.getTracks().forEach((track) => track.stop());
        alert("Face capture complete.");
        return;
      }

      context.drawImage(
        document.getElementById("video"),
        0,
        0,
        canvas.width,
        canvas.height
      );
      const imageBlob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg")
      );

      const formData = new FormData();
      formData.append("name", name);
      formData.append("role", role);
      formData.append("frame", imageBlob, `frame${sample}.jpg`);

      const res = await fetch("/upload-frame", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.status === "ok") {
        sample++;
      } else {
        console.error("Error:", data.message);
      }
    }, 300); // capture every 300ms
  });*/

let video = document.getElementById("video");
let sampleCount = 0;
const sampleLimit = 700;

navigator.mediaDevices
  .getUserMedia({ video: true })
  .then((stream) => {
    video.srcObject = stream;
    const track = stream.getVideoTracks()[0];
    const imageCapture = new ImageCapture(track);

    const interval = setInterval(() => {
      if (sampleCount >= sampleLimit) {
        clearInterval(interval); // stop sending frames
        alert("Face data collection complete!");
        return;
      }

      imageCapture.grabFrame().then((bitmap) => {
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(bitmap, 0, 0);
        canvas.toBlob((blob) => {
          const formData = new FormData();
          formData.append("frame", blob, "frame.jpg");

          fetch("/upload-frame", {
            method: "POST",
            body: formData,
          });
        }, "image/jpeg");
      });

      sampleCount++;
    }, 300);
  })
  .catch((err) => {
    console.error("Camera access error:", err);
  });
