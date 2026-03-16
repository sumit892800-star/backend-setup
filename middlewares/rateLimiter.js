const { RateLimiterRedis } = require("rate-limiter-flexible")
const redis = require("../config/redis")

const points = parseInt(process.env.RATE_LIMIT_POINTS, 10) || 50
const duration = parseInt(process.env.RATE_LIMIT_DURATION, 10) || 1

const rateLimiter = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: "middleware",
  points, // requests
  duration // per second
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
