const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises; // Use promises-based fs
const cors = require("cors");
const Tesseract = require("tesseract.js");
const axios = require("axios");
const sharp = require("sharp");

const app = express();
const PORT = 5000;
const UPLOAD_FOLDER = path.join(__dirname, "uploads");

// Ensure uploads directory exists
const ensureUploadFolder = async () => {
  try {
    await fs.mkdir(UPLOAD_FOLDER, { recursive: true });
  } catch (error) {
    console.error('Error creating upload folder:', error);
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureUploadFolder();
    cb(null, UPLOAD_FOLDER);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB file size limit
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Error logging middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error', 
    details: err.message 
  });
});

// File type validation
const isAllowedFile = (filename) => {
  const allowedExtensions = ['.png', '.jpg', '.jpeg', '.pdf', '.txt'];
  return allowedExtensions.includes(path.extname(filename).toLowerCase());
};

const preprocessImage = async (imagePath) => {
  const processedImagePath = path.join(UPLOAD_FOLDER, 'processed_' + path.basename(imagePath));

  try {
    await sharp(imagePath)
      .resize({
        width: 1200,
        height: 1600,
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 } // White background
      })
      .grayscale()
      .modulate({ contrast: 1.5 }) // Adjust the contrast value if needed
      .toFile(processedImagePath);
    
    return processedImagePath;
  } catch (error) {
    console.error('Image Preprocessing Error:', error);
    return imagePath; // Fallback to original image
  }
};

// Safe file deletion function
const safeDeleteFile = async (filePath) => {
  try {
    // Check if file exists before attempting to delete
    await fs.access(filePath);
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`Could not delete file ${filePath}:`, error);
    }
  }
};

// Text extraction function
const extractText = async (filePath) => {
  let processedImagePath;
  try {
    processedImagePath = await preprocessImage(filePath);
    
    const { data } = await Tesseract.recognize(
      processedImagePath,
      'eng',
      {
        logger: m => console.log(m),
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ',
        psm: 6 // Assume a single uniform block of text
      }
    );

    const extractedText = data.text.trim();
    return extractedText || "No readable text found in the image";

  } catch (error) {
    console.error('OCR Processing Error:', error);
    return `OCR Error: ${error.message}`;
  } finally {
    // Clean up both original and processed files
    await Promise.all([
      safeDeleteFile(filePath),
      processedImagePath && processedImagePath !== filePath 
        ? safeDeleteFile(processedImagePath) 
        : Promise.resolve()
    ]);
  }
};

// AI text organization function
const organizeTextWithAI = async (text) => {
  try {
    if (!text || text.startsWith("OCR Error") || text === "No readable text found in the image") {
      return "Unable to process prescription text";
    }

    const prompt = `Organize the following prescription text into a structured format:\n\n- Patient Information\n- Doctor Information\n- Medications\n- Special Instructions\n\nPrescription Text: ${text}`;

    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      {
        params: { key: process.env.GEMINI_API_KEY }, // Use environment variable
      }
    );

    return response.data.candidates[0]?.content?.parts[0]?.text ?? "AI processing failed";
  } catch (error) {
    console.error('AI Processing Error:', error);
    return `AI Processing Error: ${error.message}`;
  }
};

// Upload endpoint
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded. Please select a file." });
    }

    const fileExt = path.extname(req.file.originalname).toLowerCase();
    if (!isAllowedFile(req.file.originalname)) {
      await safeDeleteFile(req.file.path);
      return res.status(400).json({ 
        error: `Invalid file type. Allowed types: .png, .jpg, .jpeg, .pdf, .txt` 
      });
    }

    console.log(`Processing file: ${req.file.originalname}`);
    
    const extractedText = await extractText(req.file.path);
    const structuredText = await organizeTextWithAI(extractedText);

    res.json({
      filename: req.file.originalname,
      extracted_text: extractedText,
      structured_text: structuredText,
    });

  } catch (error) {
    console.error('Upload Processing Error:', error);
    if (req.file && req.file.path) {
      await safeDeleteFile(req.file.path);
    }
    res.status(500).json({ 
      error: 'Prescription processing failed', 
      details: error.message 
    });
  }
});

// Health check route
app.get("/", (req, res) => {
  res.json({ status: "Backend is running" });
});

// Ensure upload folder exists before starting server
ensureUploadFolder().then(() => {
  // Start server
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
});