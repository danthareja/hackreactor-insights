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
  },

  /** Stores all data associated with the logged in user here in the following format
   [
    { 
      username: 'danthareja', 
      repos: [
        { 
          name: 'hr-stats',
          stats: [** number of additions and deletions per week ** ]
        }
      ]
    }
   ]
  */
  orgMembers: Array
});

module.exports = mongoose.model('User', userSchema);