var Promise = require("bluebird");
var GitHubApi = require("github");
var http = require("request");
var secret = require("../config/secret");


/**
 * Instantiate API
 */

var github = new GitHubApi({
  version: "3.0.0"
});

/**
 * API extensions
 */

github.repos.stats = {};
github.repos.stats.codeFrequency = getGithubStats("code_frequency");
github.repos.stats.punchCard = getGithubStats("punch_card");
github.repos.stats.commitActivity = getGithubStats("commit_activity"); // Not used

function getGithubStats(type) {
  return function(options, callback) {
    var getOptions = {
      url: "https://api.github.com/repos/" + options.username + "/" + options.repo + "/stats/" + type + "?access_token=" + options.token,
      type: "GET",
      headers: {
        "User-Agent": "danthareja"
      }
    };
    http(getOptions, function(err, stats) {
      // Callback with only data we're interested in
      callback(err, stats.body);
    });
  };
}

/**
 * Promisify our API
 */

Promise.promisifyAll(github);
Promise.promisifyAll(github.user);
Promise.promisifyAll(github.orgs);
Promise.promisifyAll(github.repos);
Promise.promisifyAll(github.repos.stats);

// Authenticate user 
github.authenticateWithToken = function() {
 github.authenticate({
   type: "oauth",
   token: secret.githubToken
 });
 console.log("authenticated user!");
};


module.exports = github;