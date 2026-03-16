const bcrypt = require("bcryptjs")
const User = require("../models/User")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")

const {
  generateAccessToken,
  generateRefreshToken
} = require("../utils/genearateTokens")

const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex")
}
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

    const user = await User.findOne({email})

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

    res.cookie("refreshToken",refreshToken,{
      httpOnly:true,
      secure:false,
      sameSite:"strict"
    })

    res.json({
      accessToken
    })

  }catch(err){
    next(err)
  }

}

exports.refreshToken = async (req,res)=>{
  console.log("Refresh token called", req.cookies)

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

    res.json({accessToken})

  }catch(err){

    res.status(403).json({
      message:"Invalid refresh token"
    })

  }

}
