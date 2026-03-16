const express = require("express")

const router = express.Router()

const {
  register,
  login,
  refreshToken,
  logout
} = require("../controllers/authController")
const authRateLimiter = require("../middlewares/authRateLimiter")
const validate = require("../middlewares/validate")
const { registerSchema, loginSchema } = require("../schemas/authSchemas")

router.post("/register", authRateLimiter, validate(registerSchema), register)
router.post("/login", authRateLimiter, validate(loginSchema), login)
router.post("/refresh",refreshToken)
router.post("/logout", logout)

module.exports = router
