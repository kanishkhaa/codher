import pandas as pd
import numpy as np
import os
import cv2
import pickle
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense, Dropout
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder


csv_path = "/home/sbragul26/codher/training_labels.csv"  # Update this path
image_folder = "/home/sbragul26/codher/training_words"  # Update this path

df = pd.read_csv(csv_path)

label_encoder = LabelEncoder()
df["MEDICINE_LABEL"] = label_encoder.fit_transform(df["MEDICINE_NAME"])

IMG_SIZE = (128, 128)

image_data = []
labels = []

for index, row in df.iterrows():
    img_path = os.path.join(image_folder, row["IMAGE"])
    img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)  
    if img is None:
        print(f"Error: Could not read image {img_path}")
        continue
    img = cv2.resize(img, IMG_SIZE)  
    img = img / 255.0 
    image_data.append(img)
    labels.append(row["MEDICINE_LABEL"])


X = np.array(image_data).reshape(-1, 128, 128, 1)
y = np.array(labels)

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)


model = Sequential([
    Conv2D(32, (3,3), activation='relu', input_shape=(128,128,1)),
    MaxPooling2D(2,2),
    Conv2D(64, (3,3), activation='relu'),
    MaxPooling2D(2,2),
    Flatten(),
    Dense(128, activation='relu'),
    Dropout(0.5),
    Dense(len(label_encoder.classes_), activation='softmax')  # Output layer
])


model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
model.fit(X_train, y_train, epochs=10, validation_data=(X_test, y_test))
with open("medicine_model.pkl", "wb") as f:
    pickle.dump((model, label_encoder), f)

print("✅ Model training complete and saved as medicine_model.pkl")
