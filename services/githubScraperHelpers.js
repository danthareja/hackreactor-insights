var Promise = require("bluebird");
var GitHubApi = require("node-github"); // This is my updated version with statistics. Maybe need to commit this separately if it doesn't get pulled in (https://github.com/mikedeboer/node-github/pull/207)
var secret = require("../config/secret");

/**
 * Instantiate API
 */

var github = new GitHubApi({
  version: "3.0.0"
});
console.log(github);

/**
 * API extensions
 */

github.authenticateWithToken = function() {
 github.authenticate({
   type: "oauth",
   token: secret.githubToken
 });
 console.log("authenticated user!");
};


/**
 * Promisify our API
 */

Promise.promisifyAll(github);
Promise.promisifyAll(github.user);
Promise.promisifyAll(github.orgs);
Promise.promisifyAll(github.repos);

/**
 * Don't forget to export
 */

module.exports = github;
