import json
import pandas as pd

# Load the CSV file
df = pd.read_csv("ml_model/training_labels.csv")

# Create a list of mappings
mappings = []
for _, row in df.iterrows():
    mappings.append({
        "doctor_written_name": row["MEDICINE_NAME"],
        "actual_name": row["GENERIC_NAME"]
    })

# Save to a JSON file
with open("medicine_mapping.json", "w") as json_file:
    json.dump(mappings, json_file, indent=4)

print("JSON file created successfully!")

