const bcrypt = require("bcryptjs")
const User = require("../models/User")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const { OAuth2Client } = require("google-auth-library")

const {
  generateAccessToken,
  generateRefreshToken
} = require("../utils/genearateTokens")

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex")
}

const getRefreshCookieOptions = () => {
  const isProd = process.env.NODE_ENV === "production"
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "lax" : "strict"
  }
}

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
exports.register = async (req,res,next)=>{

  try{

    const {name,email,password} = req.body

    const existing = await User.findOne({email})

    if(existing){
      return res.status(400).json({
        message:"Email already exists"
      })
    }

    const hashedPassword = await bcrypt.hash(password,10)

    const user = await User.create({
      name,
      email,
      password:hashedPassword
    })

    res.status(201).json({
      success:true,
      data:user
    })

  }catch(err){
    next(err)
  }

}


exports.login = async (req,res,next)=>{

  try{

    const {email,password} = req.body

    const user = await User.findOne({email}).select("+password")

    if(!user){
      return res.status(400).json({
        message:"Invalid credentials"
      })
    }

    const match = await bcrypt.compare(password,user.password)

    if(!match){
      return res.status(400).json({
        message:"Invalid credentials"
      })
    }

    const accessToken = generateAccessToken(user)
    const refreshToken = generateRefreshToken(user)

    user.refreshTokenHash = hashToken(refreshToken)
    await user.save()

    res.cookie("refreshToken", refreshToken, getRefreshCookieOptions())

    res.json({
      accessToken
    })

  }catch(err){
    next(err)
  }

}

exports.googleLogin = async (req, res, next) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(500).json({
        message: "GOOGLE_CLIENT_ID is not configured"
      })
    }

    const { idToken } = req.body
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    })

    const payload = ticket.getPayload()
    if (!payload || !payload.email) {
      return res.status(400).json({
        message: "Invalid Google token"
      })
    }

    if (payload.email_verified === false) {
      return res.status(400).json({
        message: "Google email is not verified"
      })
    }

    let user = await User.findOne({ email: payload.email })
    if (!user) {
      user = await User.create({
        name: payload.name || payload.email.split("@")[0],
        email: payload.email,
        authProvider: "GOOGLE",
        googleId: payload.sub,
        avatars: payload.picture ? [payload.picture] : []
      })
    } else {
      let changed = false
      if (!user.googleId && payload.sub) {
        user.googleId = payload.sub
        changed = true
      }
      if (!user.avatars || user.avatars.length === 0) {
        if (payload.picture) {
          user.avatars = [payload.picture]
          changed = true
        }
      }
      if (changed) {
        await user.save()
      }
    }

    const accessToken = generateAccessToken(user)
    const refreshToken = generateRefreshToken(user)

    user.refreshTokenHash = hashToken(refreshToken)
    await user.save()

    res.cookie("refreshToken", refreshToken, getRefreshCookieOptions())

    res.json({
      accessToken
    })
  } catch (err) {
    next(err)
  }
}

exports.refreshToken = async (req,res)=>{

  const token = req.cookies.refreshToken

  if(!token){
    return res.status(401).json({
      message:"No refresh token"
    })
  }

  try{

    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET
    )

    const user = await User.findById(decoded.id).select("+refreshTokenHash")
    if(!user){
      return res.status(401).json({
        message:"User not found"
      })
    }

    const incomingHash = hashToken(token)
    if(!user.refreshTokenHash || user.refreshTokenHash !== incomingHash){
      return res.status(403).json({
        message:"Invalid refresh token"
      })
    }

    const accessToken = jwt.sign(
      {id:user._id, role:user.role},
      process.env.JWT_ACCESS_SECRET,
      {expiresIn:process.env.ACCESS_TOKEN_EXPIRE}
    )

    const newRefreshToken = generateRefreshToken(user)
    user.refreshTokenHash = hashToken(newRefreshToken)
    await user.save()

    res.cookie("refreshToken", newRefreshToken, getRefreshCookieOptions())

    res.json({accessToken})

  }catch(err){

    res.status(403).json({
      message:"Invalid refresh token"
    })

  }

}

exports.logout = async (req, res) => {
  const token = req.cookies.refreshToken

  if (token) {
    const hashed = hashToken(token)
    await User.findOneAndUpdate(
      { refreshTokenHash: hashed },
      { $unset: { refreshTokenHash: 1 } }
    )
  }

  res.clearCookie("refreshToken", getRefreshCookieOptions())
  res.json({ success: true, message: "Logged out" })
}
