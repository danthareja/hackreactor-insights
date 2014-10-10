var _ = require("lodash");
var GitHubApi = require("github");
var User = require("../models/User");

/**
 * GET /api/github
 * GitHub API Example.
 */

exports.getGithub = function(req, res) {
  var token = _.find(req.user.tokens, { kind: 'github' });
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