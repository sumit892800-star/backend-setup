const multer = require("multer")

const storage = multer.memoryStorage()

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 20 * 1024 * 1024,
    files: 5
  },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"]
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPG, PNG, and WebP images are allowed"))
    }
    cb(null, true)
  }
})

module.exports = upload
