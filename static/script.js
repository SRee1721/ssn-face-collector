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

// let video = document.getElementById("video");
// let sampleCount = 0;
// const sampleLimit = 700;

// navigator.mediaDevices
//   .getUserMedia({ video: true })
//   .then((stream) => {
//     video.srcObject = stream;
//     const track = stream.getVideoTracks()[0];
//     const imageCapture = new ImageCapture(track);

//     const interval = setInterval(() => {
//       if (sampleCount >= sampleLimit) {
//         clearInterval(interval); // stop sending frames
//         alert("Face data collection complete!");
//         return;
//       }

//       imageCapture.grabFrame().then((bitmap) => {
//         const canvas = document.createElement("canvas");
//         canvas.width = bitmap.width;
//         canvas.height = bitmap.height;
//         const ctx = canvas.getContext("2d");
//         ctx.drawImage(bitmap, 0, 0);
//         canvas.toBlob((blob) => {
//           const formData = new FormData();
//           formData.append("frame", blob, "frame.jpg");

//           fetch("/upload-frame", {
//             method: "POST",
//             body: formData,
//           });
//         }, "image/jpeg");
//       });

//       sampleCount++;
//     }, 300);
//   })
//   .catch((err) => {
//     console.error("Camera access error:", err);
//   });
// Maintenance mode check
fetch("/firebase-config")
  .then((response) => response.json())
  .then((firebaseConfig) => {
    // if (!firebase.apps.length) {
    //   console.log("Loaded Firebase Config:", firebaseConfig);
    //   firebase.initializeApp(firebaseConfig);
    // }
    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();
    db.ref("site_status/enabled").on("value", (snapshot) => {
      const enabled = snapshot.val();
      console.log("[DEBUG] Maintenance status from Firebase:", enabled);
      // Robust check for all falsey/disabled values
      if (
        enabled === false ||
        enabled === "false" ||
        enabled === 0 ||
        enabled === "0" ||
        enabled === null ||
        enabled === undefined
      ) {
        console.log("site_status/enabled =", enabled);

        document.body.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;">
            <h1 style="color:#d32f2f;font-size:2.5rem;">Server Unavailable</h1>
            <p style="font-size:1.2rem;">The server is currently unavailable due to maintenance.<br>Please check back later.</p>
          </div>
        `;
        return;
      }
      // Only run main app logic if enabled is true
      console.log("MAINNNNN");
      runMainApp(firebaseConfig);
      console.log("RUNNING MAIN APP");
    });
  });

function runMainApp(firebaseConfig) {
  let sampleCount = 0;
  const db = firebase.firestore();

  const busStopSelect = document.getElementById("busStop");

  db.collection("default_routes")
    .get()
    .then((querySnapshot) => {
      const stopsSet = new Set();
      querySnapshot.forEach((doc) => {
        const stops = doc.data().stops || [];
        stops.forEach((stop) => stopsSet.add(stop));
      });
      busStopSelect.innerHTML = '<option value="">Select your stop</option>';
      Array.from(stopsSet)
        .sort()
        .forEach((stop) => {
          const option = document.createElement("option");
          option.value = stop;
          option.textContent = stop;
          busStopSelect.appendChild(option);
        });
    });

  const form = document.getElementById("infoForm");
  const video = document.getElementById("video");
  const sampleCountSpan = document.getElementById("sampleCount");
  const sampleCounter = document.getElementById("sampleCounter");

  let intervalId = null;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("dob").value;
    const role = document.getElementById("role").value;
    const busStop = document.getElementById("busStop").value;

    const res = await fetch("/start-face-collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name,
        email: email,
        dob: password,
        role: role,
        busStop: busStop,
      }),
    });

    const result = await res.json();
    if (result.message === "Collection started and student registered") {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          video.style.display = "block";
          video.srcObject = stream;
          const track = stream.getVideoTracks()[0];
          const imageCapture = new ImageCapture(track);

          intervalId = setInterval(() => {
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
                })
                  .then((res) => res.json())
                  .then((data) => {
                    sampleCount++;
                    sampleCounter.style.display = "block";
                    sampleCountSpan.textContent = sampleCount;
                    if (data.done) {
                      clearInterval(intervalId);
                      alert("Face data collection complete!");
                    }
                  });
              }, "image/jpeg");
            });
          }, 300);
        })
        .catch((err) => {
          console.error("Camera access error:", err);
          alert("Unable to access the camera. Please allow permissions.");
        });
    } else if (result.error) {
      // Handle authentication and other errors
      if (res.status === 409) {
        alert(
          "A user with this email already exists. Please use a different email or log in."
        );
      } else if (res.status === 401) {
        alert(
          "Authentication failed. Please check your email and password (DOB)."
        );
      } else {
        alert(`Error: ${result.error}`);
      }
    }
  });
}
