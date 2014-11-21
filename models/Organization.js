var mongoose = require('mongoose');

var organizationSchema = new mongoose.Schema({
  // Profile info
  username: String,
  profile: {
    display_name: String,
    url: String,
    avatar: String,
    location: String,
    email: String,
    public_repos: Number,
    public_gists: Number,
    followers: Number,
    following: Number,
    created_at: Date,
    updated_at: Date
  },
  
  // Format for each member of the organization
  members: [{
    username: String,
    etag: String,
    repos: [{
      name: String,
      owner: String,
      stats: {
        codeFrequency: String,
        punchCard: String,
        commitActivity: String,
      },
      updated_at: String
    }]
  }],
});

module.exports = mongoose.model('Organization', organizationSchema);