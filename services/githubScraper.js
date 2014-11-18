var async = require("async");
var github = require("./githubScraperSteps");

var getGitHubStats = async.compose(github.allDone, github.getRepoStats, github.getMemberRepos, github.getMembers, github.getOrganization);
getGitHubStats('hackreactor', function(err, results) {
  console.log('All done!');
});

// var testMe = async.compose(github.allDone, github.getRepoStats, github.getOrganization);
// testMe('hackreactor', function(err, results) {
//   console.log('All done!');
// });