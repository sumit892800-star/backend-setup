const Joi = require("joi")

const registerSchema = Joi.object({
  name: Joi.string().min(3).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required()
})

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
})

const googleLoginSchema = Joi.object({
  idToken: Joi.string().required()
})

module.exports = {
  registerSchema,
  loginSchema,
  googleLoginSchema
}
