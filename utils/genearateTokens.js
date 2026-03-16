const jwt = require("jsonwebtoken")

const generateAccessToken = (user) => {

  return jwt.sign(
    { id:user._id, role:user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn:process.env.ACCESS_TOKEN_EXPIRE }
  )

}

const generateRefreshToken = (user) => {

  return jwt.sign(
    { id:user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn:process.env.REFRESH_TOKEN_EXPIRE }
  )

}

module.exports = {
  generateAccessToken,
  generateRefreshToken
}