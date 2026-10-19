'use strict';

// Validates req.body against a Joi schema and replaces it with the sanitized value (unknown keys stripped)
module.exports = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    return res.status(400).json({ message: error.details.map((d) => d.message).join('; ') });
  }
  req.body = value;
  next();
};
