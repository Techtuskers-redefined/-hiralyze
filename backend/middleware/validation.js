import Joi from 'joi';

export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { 
      abortEarly: false,
      stripUnknown: true 
    });
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({ 
        message: 'Validation error',
        details: errorMessage 
      });
    }
    
    next();
  };
};

export const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(128).required(),
  role: Joi.string().valid('candidate', 'hr').required()
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export const profileUpdateSchema = Joi.object({
  name: Joi.string().min(2).max(50),
  phone: Joi.string().pattern(/^[+]?[\d\s\-\(\)]+$/).allow(''),
  location: Joi.string().max(100).allow(''),
  bio: Joi.string().max(500).allow(''),
  skills: Joi.array().items(Joi.string().max(50)),
  experience: Joi.array().items(Joi.object({
    company: Joi.string().required(),
    position: Joi.string().required(),
    description: Joi.string().allow(''),
    startDate: Joi.string().required(),
    endDate: Joi.string().allow(''),
    current: Joi.boolean()
  })),
  education: Joi.array().items(Joi.object({
    institution: Joi.string().required(),
    degree: Joi.string().required(),
    field: Joi.string().required(),
    startDate: Joi.string().required(),
    endDate: Joi.string().required(),
    gpa: Joi.string().allow('')
  }))
});

export const jobCreateSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  company: Joi.string().min(2).max(100).required(),
  location: Joi.string().max(100).required(),
  type: Joi.string().valid('full-time', 'part-time', 'contract', 'internship').required(),
  salary: Joi.string().max(50).allow(''),
  description: Joi.string().min(50).required(),
  requirements: Joi.array().items(Joi.string().max(200)),
  benefits: Joi.array().items(Joi.string().max(200)),
  expiryDate: Joi.date().min('now').required()
});