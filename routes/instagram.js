const express = require("express")
const router = express.Router()

const { downloadMedia } = require("../controllers/instaController")

router.post("/download", downloadMedia)

module.exports = router