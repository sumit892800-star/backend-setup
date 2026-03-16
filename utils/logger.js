const Joi = require("joi")

const userSchema = Joi.object({

  name:Joi.string().min(3).required(),

  email:Joi.string().email().required()

})

const validateUser = (req,res,next)=>{

  const {error} = userSchema.validate(req.body)

  if(error){

    return res.status(400).json({
      success:false,
      message:error.details[0].message
    })

  }

  next()

}

module.exports = validateUser