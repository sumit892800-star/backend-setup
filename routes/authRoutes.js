const express = require("express")

const router = express.Router()

const {
  register,
  login,
  refreshToken
} = require("../controllers/authController")
const authRateLimiter = require("../middlewares/authRateLimiter")

router.post("/register", authRateLimiter, register)
router.post("/login", authRateLimiter, login)
router.post("/refresh",refreshToken)

module.exports = router
