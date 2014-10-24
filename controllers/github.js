var http = require("request");
var GitHubApi = require("github");
var User = require("../models/User");

// Instantiate API
var github = new GitHubApi({
  version: "3.0.0"
});

/**
 * GET /api/github
 * GitHub API Example. Gets authenticated user's data.
 */

exports.test = function(req, res) {
  console.log("github.get called");
  console.log("User in get: ",req.user);
  console.log("Token in get", req.user.token);
  console.log(req.user.orgMembers);

  github.authenticate({
    type: "oauth",
    token: req.user.token
  });

  github.user.get({ user: "danthareja" }, function(err, data) {
    res.send(data);
  });
};

/**
 * GET /api/github/members
 * Gets both hidden and public memberships in Hack Reactor for currently authenticated user.
 * Stores all members in user.orgMembers array in Mongo
 */

// TODO: refactor and abstract number of pages out (github pagnation)
exports.getMembers = function(req, res) {
  console.log("github.getMembers called");
  var user = req.user;
  user.orgMembers = [];
  
  github.authenticate({
    type: "oauth",
    token: user.token
  });
  console.log("authenticated user!");

  console.log("Requesting page 1 members");
  github.orgs.getMembers({ org: "hackreactor", per_page: 100, page: 1 }, function(err, members) {
    console.log("Got page 1 members! ", members);
    // Push all members to orgMembers array
    members.forEach(function(member) {
      console.log("adding ", member.login);
      user.orgMembers.push({
        username: member.login,
        repos: []
      });
    });

    // Do it again for the second page
    console.log("Requesting page 2 members");
    github.orgs.getMembers({ org: "hackreactor", per_page: 100, page: 2 }, function(err, members) {
    console.log("Got page 2 members! ", members);
      
      // Push all page 2 members to orgMembers array
      members.forEach(function(member) {
        console.log("adding ", member.login);
        user.orgMembers.push({
          username: member.login,
          repos: []
        });
      });

      // Save data to mongo
      user.save(function(err, user, numberAffected) {
        if (err) console.log("Error saving members to mongo", err);
        else {
          console.log("Page 2 members saved to mongo! ", numberAffected, " entries affected");
          res.send(user.orgMembers);
        }
      });

    });
  });
};


/**
 * GET /api/github/members/repos
 * Goes through each member in the authenticated user's orgMembers array and gets all repos associated with each member
 * Stores ONLY REPOS THAT HAVE BEEN UPDATED IN THE PAST WEEK repos in user.orgMembers.[[member]].repos array in mongo
 */

// TODO: abstract out per page options, aync
exports.getMemberRepos = function(req, res) {
  console.log("github.getMemberRepos called");
  var user = req.user;
  var members = user.orgMembers;
  var repoCount = 0;
  var completedRequests = 0;
  
  // Authenticate
  github.authenticate({
    type: "oauth",
    token: user.token
  });
  console.log("authenticated user!");

  // For each member, send a request to github for their repos
  members.forEach(function(member) {
    member.repos = []; // Reset repos

    var options = {
      user: member.username,
      sort: "updated",
      type: "owner", // Avoid duplicates across groups
      per_page: 100
    };

    github.repos.getFromUser(options, function(err, repos) {
      if (err) console.log(err);
      // Push recently updated repos to mongo
      repos && repos.forEach(function(repo) {
        if (wasUpdatedThisWeek(repo)) {
          console.log("adding ", repo.full_name, " to ", member.username, "'s repos array");
          member.repos.push({
            name: repo.name,
            stats: []
          });
          repoCount++; // increment counter on mongo for repoStats
          console.log("repo count is at ", repoCount);
        }
      });

      // Waits until all repos have been completed until res.send
      if (++completedRequests === members.length) {
        // Update repo count
        user.repoCount = repoCount;
        // Save data to mongo
        user.save(function(err, user, numberAffected) {
          if (err) {
            console.log("Error saving repos to mongo", err);
          } else {
            console.log("repos saved to mongo!", numberAffected, " entries affected");
          }
        });
        res.send(members);
      }
    });
  });
  
  function wasUpdatedThisWeek(repo) {
    var updatedAt = new Date(repo.updated_at);
    var now = new Date();
    var lastWeek = new Date(now);
    lastWeek.setDate(lastWeek.getDate() - 7);

    return updatedAt > lastWeek && updatedAt < now;
  }
};


/**
 * GET /api/github/members/repos/stats
 * Goes through each repo in the authenticated user's orgMembers array and gets all stats associated with each repo
 * Stores all stats in user.orgMembers.[[member]].[[repo]].stats array in mongo
 */

// TODO: Figure out what stats to display. I'm gonna try to get punch_card and code_freq for all of them
// TODO: Filter repos update in this past week to query for punch_card (lookup If-Modified-Since header) ** Currently filtered based on past week **
exports.getRepoStats = function(req, res) {
  console.log("github.getRepoStats called");
  var user = req.user;
  var members = user.orgMembers;
  var completedRequests = 0;
  
  // Authenticate
  github.authenticate({
    type: "oauth",
    token: req.user.token
  });
  console.log("authenticated user!");

  // Get stats for every member's repos
  members.forEach(function(member) {
    console.log("getting stats for member ", member);
    member.repos.length > 0 && member.repos.forEach(function(repo) {
      // Set http request options, this one's not in our handy library
      // Code frequency
      var codeFreqUrl = "https://api.github.com/repos/" + member.username + "/" + repo.name + "/stats/code_frequency" + "?access_token=" + user.token;
      var getCodeFrequency = {
        url: codeFreqUrl,
        type: "GET",
        headers: {
          "User-Agent": "danthareja"
        }
      };

      // Punch card
      var punchCardUrl = "https://api.github.com/repos/" + member.username + "/" + repo.name + "/stats/punch_card" + "?access_token=" + user.token;
      var getPunchCard = {
        url: punchCardUrl,
        type: "GET",
        headers: {
          "User-Agent": "danthareja"
        }
      };

      // Make requests
      http(getCodeFrequency, function(err, stats) {
        if (err) console.log("error getting code freq");
        repo.stats.codeFrequency = stats;
        http(getPunchCard, function(err, stats) {
          if (err) console.log("error getting punch card");
          repo.stats.punchCard = stats;
          console.log("repo found! getting stats for member ", member.username, " and repo ",  repo);
          console.log("number of completed requests down: ", completedRequests);
          if (++completedRequests === user.repoCount) {
            // Save data to mongo
            user.save(function(err, user, numberAffected) {
              if (err) {
                console.log("Error saving stats to mongo", err);
              } else {
                console.log("stats saved to mongo!", numberAffected, " entries affected");
              }
            });
            res.send(members);
          }
        });
      });

    });
  });
};


