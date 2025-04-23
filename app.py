
from flask import Flask, request, jsonify, render_template, redirect, url_for, session
import firebase_admin
from firebase_admin import credentials, firestore
import numpy as np
from PIL import Image
from io import BytesIO
import cv2
from insightface.app import FaceAnalysis
import os

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY")
cred = credentials.Certificate('/etc/secrets/ServiceAccountKey.json')
firebase_admin.initialize_app(cred)
store = firestore.client()
COLLECTION_NAME = "academy:register"

faceapp = FaceAnalysis(name='buffalo_sc', root='insightface_model', providers=[
                       'CPUExecutionProvider'])
faceapp.prepare(ctx_id=0, det_size=(640, 640), det_thresh=0.5)

# Shared session state
received_embeddings = []
sample_limit = 50
current_name_role = None


'''@app.route('/')
def index():
    return render_template("index.html")'''


@app.route('/')
def home():
    return redirect(url_for('login'))


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('email')
        password = request.form.get('password')

        if username == 'admin@ssn.edu.in' and password == 'ssnbuses':
            session['logged_in'] = True
            return redirect(url_for('index_page'))
        else:
            return render_template('login.html', error='Invalid credentials')

    return render_template('login.html')


@app.route('/index')
def index_page():
    if 'logged_in' in session and session['logged_in']:
        return render_template("index.html")
    return redirect(url_for('login'))


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))


@app.route('/start-face-collection', methods=['POST'])
def start_face_collection():
    global received_embeddings, current_name_role
    data = request.get_json()
    name = data['name']
    role = data['role']
    received_embeddings = []
    # Extract student info
    ssn_email_id = data.get('email')
    dob = data.get('dob')
    stop = data.get('busStop')
    name_role = f"{name}@{role}"
    current_name_role = name_role
    received_embeddings = []

    # Validate required fields
    if not all([name, role, ssn_email_id, dob, stop]):
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        # Get users collection
        users_ref = store.collection("users")
        docs = users_ref.stream()

        # Generate unique user_id
        existing_user_ids = [int(doc.id) for doc in docs if doc.id.isdigit()]
        user_id = max(existing_user_ids, default=0) + 1

        # Register user in Firestore
        user_data = {
            "ssn_email_id": ssn_email_id,
            "password": dob,
            name_role: "face_data",  # placeholder
            "stop": stop
        }
        users_ref.document(str(user_id)).set(user_data)

        print(f"Registered student {name_role} with user_id {user_id}")
        return jsonify({"message": "Collection started and student registered"})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/upload-frame', methods=['POST'])
def upload_frame():
    global received_embeddings, current_name_role

    if not current_name_role:
        return jsonify({"error": "Collection not started"}), 400

    file = request.files['frame']
    img = Image.open(BytesIO(file.read()))
    frame = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    results = faceapp.get(frame, max_num=1)

    if results:
        embedding = results[0]['embedding']
        if len(received_embeddings) < sample_limit:
            received_embeddings.append(embedding)
            print(f"Sample {len(received_embeddings)}/{sample_limit}")

    if len(received_embeddings) == sample_limit:
        final_embedding = np.mean(received_embeddings, axis=0)
        received_embeddings = []

        doc_ref = store.collection(COLLECTION_NAME).document("facial_features")
        doc = doc_ref.get()
        embedding_bytes = final_embedding.tobytes()

        if doc.exists:
            existing = doc.to_dict()
            if current_name_role in existing:
                print("User already exists.")
            else:
                doc_ref.set({current_name_role: embedding_bytes}, merge=True)
        else:
            doc_ref.set({current_name_role: embedding_bytes})

        print(" Face data saved for:", current_name_role)
        current_name_role = None
        return jsonify({"done": True})

    return jsonify({"done": False})


'''@app.route('/register-student', methods=['POST'])'''


def register_student():
    try:
        data = request.get_json()

        ssn_email_id = data.get('email')
        dob = data.get('dob')
        name = data.get('name')  # Used as password
        role = data.get('role')  # Same as face data identifier
        stop = data.get('busStop')
        name_role = name+'@'+role
        if not all([ssn_email_id, dob, name, role, stop]):
            return jsonify({'error': 'Missing fields'}), 400

        # Get the users collection
        users_ref = store.collection("users")
        docs = users_ref.stream()

        # Count existing documents to generate next user_id
        existing_user_ids = [int(doc.id) for doc in docs if doc.id.isdigit()]
        user_id = max(existing_user_ids, default=0) + 1

        # Prepare data
        user_data = {
            "ssn_email_id": ssn_email_id,
            "password": dob,
            name_role: "face_data",  # Placeholder if face data isn't included here
            "stop": stop
        }

        # Save to Firestore
        users_ref.document(str(user_id)).set(user_data)

        return jsonify({'message': f'Student registered with user_id {user_id}'})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True)
