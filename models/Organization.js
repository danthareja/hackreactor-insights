var mongoose = require('mongoose');

var organizationSchema = new mongoose.Schema({
  // Org profile info from GET orgs/[name]
  login: { type: String, default: '' }, // username
  profile: {
    name: { type: String, default: '' },
    url: { type: String, default: '' },
    avatar: { type: String, default: '' },
    location: { type: String, default: '' },
    email: { type: String, default: '' },
    public_repos: { type: Number, default: 0 },
    public_gists: { type: Number, default: 0 },
    followers: { type: Number, default: 0 },
    following: { type: Number, default: 0 },
    created_at: Date,
    updated_at: Date
  },
  
  // Format for each member of the organization
  members: [{
    username: String,
    repos: [{
      name: String,
      stats: {
        codeFrequency: String,
        punchCard: String,
        commitActivity: String,
      }
    }]
  }],

  recentlyUpdatedRepoCount: Number, // To handle aync stuff
});

module.exports = mongoose.model('Organization', organizationSchema);