const { RateLimiterRedis } = require("rate-limiter-flexible")
const redis = require("../config/redis")

const authRateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "auth",
  points: 5, // requests
  duration: 60 // per minute
})

module.exports = async (req, res, next) => {
  try {
    await authRateLimiter.consume(req.ip)
    next()
  } catch {
    res.status(429).json({
      success: false,
      message: "Too many auth attempts. Please try again later."
    })
  }
}
