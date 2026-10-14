const { model } = require("mongoose");

const { SignupSchema } = require("../schemas/SignupSchema");

const SignupModel = new model("signup", SignupSchema);

module.exports = { SignupModel };
