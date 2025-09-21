// Fetch Firebase config & check site status
fetch("/firebase-config")
  .then((response) => response.json())
  .then((firebaseConfig) => {
    firebase.initializeApp(firebaseConfig);
    const db = firebase.database();
    db.ref("site_status/enabled").on("value", (snapshot) => {
      const enabled = snapshot.val();
      if (
        enabled === false ||
        enabled === "false" ||
        enabled === 0 ||
        enabled === "0" ||
        enabled === null ||
        enabled === undefined
      ) {
        document.body.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;">
            <h1 style="color:#d32f2f;font-size:2.5rem;">Server Unavailable</h1>
            <p style="font-size:1.2rem;">The server is currently unavailable due to maintenance.<br>Please check back later.</p>
          </div>
        `;
        return;
      }
      runMainApp(firebaseConfig);
    });
  });

function runMainApp(firebaseConfig) {
  let sampleCount = 0;
  let intervalId = null;

  const db = firebase.firestore();
  const form = document.getElementById("infoForm");
  const video = document.getElementById("video");
  const sampleCountSpan = document.getElementById("sampleCount");
  const overlayContainer = document.getElementById("collectionOverlay");

  const busStopSelect = document.getElementById("busStop");
  const busNoSelect = document.getElementById("busNo");

  // Load bus stops
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

  // Load bus numbers
  db.collection("buses")
    .get()
    .then((querySnapshot) => {
      const busNumber = [];
      querySnapshot.forEach((doc) => busNumber.push(doc.id));

      busNoSelect.innerHTML =
        '<option value="">Select your bus number</option>';
      Array.from(busNumber)
        .sort()
        .forEach((id) => {
          const option = document.createElement("option");
          option.value = id;
          option.textContent = id;
          busNoSelect.appendChild(option);
        });
    });

  // Instructions
  const instructions = [
    "Step 1: Look straight at the camera",
    "Step 2: Tilt your head slightly down",
    "Step 3: Turn your face to the left",
    "Step 4: Turn your face to the right",
    "Step 5: Cover the left side of your face",
    "Step 6: Cover the right side of your face",
    "Step 7: Cover your mouth",
    "Step 8: Wear glasses or a mask if available",
  ];

  const animationImages = [
    "face-front.png",
    "face-down.png",
    "face-left.png",
    "face-right.png",
    "face-half-left.png",
    "face-half-right.png",
    "face-mouth.png",
    "face-mask.png",
  ];

  function updateInstruction(sampleCount) {
    const index = Math.floor((sampleCount - 1) / 10);
    if (index >= 0 && index < instructions.length) {
      document.getElementById("stepText").textContent = instructions[index];
      document.getElementById(
        "faceAnimation"
      ).style.backgroundImage = `url('/static/media/${animationImages[index]}')`;
    }
  }

  // Form submit
  /*form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const dob = document.getElementById("dob").value;
    const role = document.getElementById("role").value;
    const busStop = document.getElementById("busStop").value;

    const res = await fetch("/start-face-collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, dob, role, busStop }),
    });

    const result = await res.json();
    if (result.message === "Collection started and student registered") {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          overlayContainer.style.display = "flex"; // show overlay
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

                fetch("/upload-frame", { method: "POST", body: formData })
                  .then((res) => res.json())
                  .then((data) => {
                    sampleCount++;
                    sampleCountSpan.textContent = sampleCount;
                    updateInstruction(sampleCount);

                    if (data.done) {
                      clearInterval(intervalId);
                      alert("Face data collection complete!");
                      stream.getTracks().forEach((t) => t.stop());
                      overlayContainer.style.display = "none";
                    }
                  });
              }, "image/jpeg");
            });
          }, 300);
        })
        .catch((err) => {
          alert("Unable to access the camera. Please allow permissions.");
          console.error("Camera error:", err);
        });
    } else {
      alert(`Error: ${result.error}`);
    }
  });*/
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const dob = document.getElementById("dob").value;
    const role = document.getElementById("role").value;
    console.log("ROLE OF THE USER :", role);
    // Always get busStop & busNo, but allow empty for hostellers
    let busStop = "";
    let busNo = "";

    if (role !="Hosteller_Student") {
      busStop = document.getElementById("busStop").value;
      busNo = document.getElementById("busNo").value;
    }

    const res = await fetch("/start-face-collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, dob, role, busStop, busNo }),
    });

    const result = await res.json();
    if (result.message === "Collection started and student registered") {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          overlayContainer.style.display = "flex"; // show overlay
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

                fetch("/upload-frame", { method: "POST", body: formData })
                  .then((res) => res.json())
                  .then((data) => {
                    sampleCount++;
                    sampleCountSpan.textContent = sampleCount;
                    updateInstruction(sampleCount);

                    if (data.done) {
                      clearInterval(intervalId);
                      alert("Face data collection complete!");
                      stream.getTracks().forEach((t) => t.stop());
                      overlayContainer.style.display = "none";
                    }
                  });
              }, "image/jpeg");
            });
          }, 300);
        })
        .catch((err) => {
          alert("Unable to access the camera. Please allow permissions.");
          console.error("Camera error:", err);
        });
    } else {
      alert(`Error: ${result.error}`);
    }
  });
}
