# Face Collection Process for Face Recognition System (Live Camera)

## 📌 Overview
This project collects face samples from a live camera feed (e.g., laptop webcam, USB camera) to build a dataset for face recognition.  
The collected images/embeddings are later used to train or register users in the recognition system.


## 🎥 Face Collection Process

### 1. Start the script

Run the face collection script:

```bash
python face_collection.py
```

### 2. Camera capture

* The camera will open and start detecting faces in real time.
* **Only one face should be visible** during collection to avoid mixing embeddings.

### 3. Face detection & embedding generation

* Each frame is passed through the **InsightFace (buffalo\_sc)** model.
* A **512-d embedding vector** is extracted for the detected face.

### 4. Sample collection

* A total of **50 embeddings** are collected for each user.
* The embeddings are averaged to create a unique representation of the user’s face.

### 5. Saving the embedding

Once collection is complete, the averaged embedding is saved to Firebase under the user’s ID.

**Example structure:**

```
academy/
  register/
    studentname@role/
      embeddings: [...]

```

---

## 🚦 Instructions for Users

* Sit in a well-lit environment.
* Face the camera directly.
* Slightly move your head (left, right, up, down) while keeping your face visible.
* Wait until the process completes (\~50 samples).

---

## 📁 Output

* **Embeddings:** Stored in Firebase .

---


