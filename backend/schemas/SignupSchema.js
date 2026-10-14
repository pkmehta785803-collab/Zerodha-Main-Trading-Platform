const { Schema } = require("mongoose");

const SignupSchema = new Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = { SignupSchema };
