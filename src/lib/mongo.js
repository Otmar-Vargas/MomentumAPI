const dotEnvX = require("./dotenvXconfig.js");
const mongoose = require("mongoose");

const connectMongo = async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(dotEnvX.CONNECTION_STRING, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  }
};

module.exports = connectMongo;