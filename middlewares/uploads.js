const multer = require("multer")
const path = require("path")
const fs = require("fs")

const uploadPath = path.join(__dirname, "../uploads")

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath)
}

const storage = multer.diskStorage({

  destination: (req, file, cb) => {
    cb(null, uploadPath)
  },

  filename: (req, file, cb) => {

    const uniqueName = Date.now() + "-" + file.originalname
    cb(null, uniqueName)

  }

})

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024,
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
