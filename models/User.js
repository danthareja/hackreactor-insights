var mongoose = require("mongoose");

var userSchema = new mongoose.Schema({

  // From Github OAuth
  email: { type: String, unique: true, lowercase: true },
  githubId: String,
  token: String,
  profile: {
    name: { type: String, default: '' },
    gender: { type: String, default: '' },
    location: { type: String, default: '' },
    website: { type: String, default: '' },
    picture: { type: String, default: '' }
  }

  // Data to store

});

module.exports = mongoose.model('User', userSchema);