const express = require("express")

const router = express.Router()

const {
  register,
  login,
  googleLogin,
  refreshToken,
  logout
} = require("../controllers/authController")
const authRateLimiter = require("../middlewares/authRateLimiter")
const validate = require("../middlewares/validate")
const { registerSchema, loginSchema, googleLoginSchema } = require("../schemas/authSchemas")

router.post("/register", authRateLimiter, validate(registerSchema), register)
router.post("/login", authRateLimiter, validate(loginSchema), login)
router.post("/google", authRateLimiter, validate(googleLoginSchema), googleLogin)
router.post("/refresh",refreshToken)
router.post("/logout", logout)

module.exports = router
