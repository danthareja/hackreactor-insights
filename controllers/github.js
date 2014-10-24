var GitHubApi = require("github");
var User = require("../models/User");

// Instantiate API
var github = new GitHubApi({
  version: "3.0.0"
});

/**
 * GET /api/github
 * GitHub API Example. Gets authenticated user's data
 */

exports.get = function(req, res) {
  console.log("github.getGithub called");
  console.log("User in getGithub: ",req.user);
  console.log("Token in getGithub", req.user.token);

  github.authenticate({
    type: "oauth",
    token: req.user.token
  });

  github.user.get({ user: "danthareja" }, function(err, data) {
    res.send(data);
  });
};