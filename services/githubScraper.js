var async = require("async");
var github = require("./githubScraperSteps");

// var getGitHubStats = async.compose(github.allDone, github.getRepoStats, github.getMemberRepos, github.getMembers, github.getOrganization);
// getGitHubStats('hackreactor', function(err, results) {
//   console.log('All done!');
// });

var testMe = async.compose(github.allDone, github.getRepoStats, github.getOrganization);
testMe('hackreactor', function(err, results) {
  console.log('All done!');
});

// If-ModifiedSince
// curl -i https://api.github.com/users/kayellpeee?access_token=2b46b34cef88b53a0d5165b09df76b5b54975400
// curl -i https://api.github.com/users/kayellpeee/repos?type=owner&sort=updated&per_page=100&access_token=2b46b34cef88b53a0d5165b09df76b5b54975400
// curl -i https://api.github.com/repos/kayellpeee/Vigenere-cipher?access_token=2b46b34cef88b53a0d5165b09df76b5b54975400 -H 'If-None-Match: "2e6bdd3a5da87a5b552fb916f2541100"'
// curl -i https://api.github.com/repos/kayellpeee/Vigenere-cipher?access_token=2b46b34cef88b53a0d5165b09df76b5b54975400 -H 'If-None-Match: "1b9fbf8a9b0f7631c6919df7d6b0398e"'
// curl -i https://api.github.com/repos/kayellpeee/Vigenere-cipher?access_token=2b46b34cef88b53a0d5165b09df76b5b54975400 -H 'If-None-Match: "037a7db93755bf9efafc0b3d77de339e"'
// curl -i https://api.github.com/repos/kayellpeee/Vigenere-cipher?access_token=2b46b34cef88b53a0d5165b09df76b5b54975400 -H 'If-Modified-Since: Mon, 17 Nov 2014 20:42:04 GMT'
