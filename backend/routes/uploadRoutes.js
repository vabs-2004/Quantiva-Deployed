const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { authenticate, adminOnly } = require("../middleware/auth");

const IS_PRODUCTION = process.env.NODE_ENV === "production";

let upload;

if (IS_PRODUCTION && process.env.CLOUDINARY_CLOUD_NAME) {
  // ─── Production: Cloudinary Storage ───────────────
  const { v2: cloudinary } = require("cloudinary");
  const { CloudinaryStorage } = require("multer-storage-cloudinary");

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  const cloudStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: "Quantiva-Deployed",
      allowed_formats: ["jpg", "jpeg", "png", "gif", "webp", "svg"],
      transformation: [{ quality: "auto", fetch_format: "auto" }],
    },
  });

  upload = multer({
    storage: cloudStorage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB limit
  });
} else {
  // ─── Development: Local Disk Storage ──────────────
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadDir = path.join(__dirname, "../uploads");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + "-" + uniqueSuffix + ext);
    },
  });

  upload = multer({
    storage: storage,
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|webp|svg/;
      const extName = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimeType = allowedTypes.test(file.mimetype);

      if (extName && mimeType) {
        return cb(null, true);
      } else {
        return cb(new Error("Error: Only image files are allowed!"));
      }
    },
  });
}

/**
 * POST /api/upload
 * Admin only endpoint to upload an image.
 * In production → uploads to Cloudinary and returns the Cloudinary URL.
 * In development → uploads to local /uploads/ folder.
 */
router.post("/", authenticate, adminOnly, upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    let imageUrl;

    if (IS_PRODUCTION && process.env.CLOUDINARY_CLOUD_NAME) {
      // Cloudinary returns the full URL in req.file.path
      imageUrl = req.file.path;
    } else {
      // Local storage: return relative path
      imageUrl = `/uploads/${req.file.filename}`;
    }

    res.status(201).json({
      message: "Image uploaded successfully",
      url: imageUrl,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Failed to upload image." });
  }
});

module.exports = router;
