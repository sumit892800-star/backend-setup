const User = require("../models/User")
const redis = require("../config/redis")

exports.createUser = async (req, res, next) => {

  try {

    const { name, email } = req.body
    const files = req.files || []
    const filePaths = files.map(file => file.path)

    const existing = await User.findOne({ email })

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Email already exists"
      })
    }

    const user = await User.create({
      name,
      email,
      avatars: filePaths
    })

    // clear cache
    const keys = await redis.keys("users:*")
    if (keys.length > 0) {
      await redis.del(keys)
    }

    res.status(201).json({
      success: true,
      data: user
    })

  } catch (error) {

    next(error)

  }

}

exports.getUsers = async (req, res, next) => {

  try {

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100)
    const skip = (page - 1) * limit

    const filter = {}
    if (req.query.role) {
      filter.role = String(req.query.role).toUpperCase()
    }
    if (req.query.search) {
      const regex = new RegExp(req.query.search, "i")
      filter.$or = [{ name: regex }, { email: regex }]
    }

    const cacheKey = `users:page:${page}:limit:${limit}:role:${filter.role || "any"}:search:${req.query.search || "any"}`
    const cached = await redis.get(cacheKey)

    if (cached) {

      return res.json({
        success: true,
        source: "cache",
        data: JSON.parse(cached)
      })

    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter)
    ])

    await redis.set(
      cacheKey,
      JSON.stringify({
        items: users,
        total,
        page,
        limit
      }),
      "EX",
      60
    )

    res.json({
      success: true,
      source: "db",
      data: {
        items: users,
        total,
        page,
        limit
      }
    })

  } catch (error) {
    next(error)

  }

}
