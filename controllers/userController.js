const User = require("../models/User")
const redis = require("../config/redis")
const { Upload } = require("@aws-sdk/lib-storage")
const s3 = require("../config/s3")

// Normalize stored avatar values into public URLs (S3 if configured, else app base URL)
const toPublicUrl = (value) => {
  if (!value) return value
  if (value.startsWith("http://") || value.startsWith("https://")) return value

  const s3Base = process.env.S3_PUBLIC_URL
  if (s3Base) {
    return `${s3Base.replace(/\/+$/, "")}/${String(value).replace(/^\/+/, "")}`
  }

  const base = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 5000}`
  return `${base.replace(/\/+$/, "")}/${String(value).replace(/^\/+/, "")}`
}

// Build a public URL for an S3 object key (uses S3_PUBLIC_URL if set)
const buildS3Url = (key) => {
  const s3Base = process.env.S3_PUBLIC_URL
  if (s3Base) {
    return `${s3Base.replace(/\/+$/, "")}/${String(key).replace(/^\/+/, "")}`
  }

  const bucket = process.env.S3_BUCKET
  const region = process.env.AWS_REGION
  if (!bucket || !region) return key

  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`
}

// Parse base64 payloads from JSON (supports data URL or raw base64)
const parseBase64File = (file) => {
  const maxSize = parseInt(process.env.MAX_FILE_SIZE, 10) || 20 * 1024 * 1024
  let base64 = file.data || ""
  let contentType = file.contentType || "application/octet-stream"
  let filename = file.filename || `file-${Date.now()}`

  if (base64.startsWith("data:")) {
    const match = base64.match(/^data:(.+);base64,(.+)$/)
    if (!match) return null
    contentType = match[1]
    base64 = match[2]
  }

  const buffer = Buffer.from(base64, "base64")
  if (buffer.length === 0 || buffer.length > maxSize) return null

  return { buffer, contentType, filename }
}

// Creates a user from multipart/form-data and uploads avatars to S3
exports.createUser = async (req, res, next) => {

  try {

    const { name, email } = req.body
    const files = req.files || []

    // S3 is required when files are sent
    if (files.length > 0 && !process.env.S3_BUCKET) {
      return res.status(500).json({
        success: false,
        message: "S3_BUCKET is not configured"
      })
    }

    // Upload each file buffer to S3 and store its public URL
    const filePaths = await Promise.all(files.map(async (file) => {
      const safeName = file.originalname.replace(/\s+/g, "_")
      const key = `uploads/${Date.now()}-${safeName}`

      const upload = new Upload({
        client: s3,
        params: {
          Bucket: process.env.S3_BUCKET,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype
        }
      })

      await upload.done()
      return buildS3Url(key)
    }))

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

// Lists users with cached pagination; avatar URLs are normalized for clients
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

    const items = users.map(user => ({
      ...user,
      avatars: Array.isArray(user.avatars) ? user.avatars.map(toPublicUrl) : []
    }))

    const ttl = parseInt(process.env.CACHE_TTL, 10) || 60
    await redis.set(
      cacheKey,
      JSON.stringify({
        items,
        total,
        page,
        limit
      }),
      "EX",
      ttl
    )

    res.json({
      success: true,
      source: "db",
      data: {
        items,
        total,
        page,
        limit
      }
    })

  } catch (error) {
    next(error)

  }

}

// Creates a user from raw JSON (base64 avatars) and uploads avatars to S3
exports.createUserJson = async (req, res, next) => {
  try {
    const { name, email, avatars = [] } = req.body

    const existing = await User.findOne({ email })
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Email already exists"
      })
    }

    if (avatars.length > 0 && !process.env.S3_BUCKET) {
      return res.status(500).json({
        success: false,
        message: "S3_BUCKET is not configured"
      })
    }

    const filePaths = await Promise.all(avatars.map(async (file) => {
      const parsed = parseBase64File(file)
      if (!parsed) {
        return null
      }

      const safeName = parsed.filename.replace(/\s+/g, "_")
      const key = `uploads/${Date.now()}-${safeName}`

      const upload = new Upload({
        client: s3,
        params: {
          Bucket: process.env.S3_BUCKET,
          Key: key,
          Body: parsed.buffer,
          ContentType: parsed.contentType
        }
      })

      await upload.done()
      return buildS3Url(key)
    }))

    const filteredPaths = filePaths.filter(Boolean)

    const user = await User.create({
      name,
      email,
      avatars: filteredPaths
    })

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
