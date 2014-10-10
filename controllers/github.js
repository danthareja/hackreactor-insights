var GitHubApi = require("github");
var User = require("../models/User");
var _ = require("lodash");

/**
 * GET /api/github
 * GitHub API Example.
 */

exports.getGithub = function(req, res) {
  console.log("User in getGithub: ",req.user);
  var token = _.find(req.user.tokens, { kind: 'github' });
  console.log("Token in getGithub",token);
  var github = new GitHubApi({
    version: "3.0.0",
  });

  github.authenticate({
    type: "oauth",
    token: token.accessToken
  });

  github.user.getFollowingFromUser({ user: "danthareja" }, function(err, data) {
    console.log(JSON.stringify(data));
    res.send(data);
  });
};