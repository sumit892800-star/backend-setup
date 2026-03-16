const { RateLimiterRedis } = require("rate-limiter-flexible")
const redis = require("../config/redis")

const rateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "middleware",
  points: 10, // requests
  duration: 1 // per second
})

module.exports = async (req, res, next) => {

  try {

    await rateLimiter.consume(req.ip)

    next()

  } catch {

    res.status(429).json({
      success: false,
      message: "Too many requests. Please slow down."
    })

  }

}