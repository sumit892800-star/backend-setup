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
    await redis.del("users")

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

    const cached = await redis.get("users")

    if (cached) {

      return res.json({
        success: true,
        source: "cache",
        data: JSON.parse(cached)
      })

    }

    const users = await User.find()

    await redis.set(
      "users",
      JSON.stringify(users),
      "EX",
      60
    )

    res.json({
      success: true,
      source: "db",
      data: users
    })

  } catch (error) {
    next(error)

  }

}