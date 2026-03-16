const Joi = require("joi")

const avatarSchema = Joi.object({
  filename: Joi.string().min(1).required(),
  contentType: Joi.string().min(3).required(),
  data: Joi.string().min(10).required()
})

const userJsonSchema = Joi.object({
  name: Joi.string().min(3).required(),
  email: Joi.string().email().required(),
  avatars: Joi.array().items(avatarSchema).max(5).default([])
})

module.exports = userJsonSchema
