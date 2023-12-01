from PIL import Image
from flask import Flask, request, jsonify
import os
from transformers import ViltProcessor, ViltForQuestionAnswering

# Prepare image + question
processor = ViltProcessor.from_pretrained("dandelin/vilt-b32-finetuned-vqa")
model = ViltForQuestionAnswering.from_pretrained("dandelin/vilt-b32-finetuned-vqa")
app = Flask(__name__)

# Specify the path to the uploads folder
app.config["UPLOAD_FOLDER"] = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

@app.route('/predict', methods=['POST'])
def predict():
    try:
        # Access the uploaded file from the request
        uploaded_file = request.files['file']

        # Check if a file was provided
        if uploaded_file is None:
            return jsonify({'error': 'No file provided'}), 400

        # Save the uploaded file to the upload folder
        img_path = os.path.join(app.config["UPLOAD_FOLDER"], uploaded_file.filename)
        uploaded_file.save(img_path)
        print("Image saved at:", img_path)

        # Access the question from the form data
        question = request.form['question']
        print("Question:", question)

        # Open the image
        image = Image.open(img_path)

        # Process the image and question
        encoding = processor(image, question, return_tensors="pt")

        # Forward pass
        outputs = model(**encoding)
        logits = outputs.logits
        idx = logits.argmax(-1).item()
        print("Predicted answer:", model.config.id2label[idx])
        output = model.config.id2label[idx]

        output_data = {'prediction': output}
        return jsonify(output_data)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = 8000  # Choose the port you want to use
    print(f"Starting the app on port {port}")
    app.run(debug=True, port=port)
