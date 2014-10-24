var _ = require("lodash");
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

exports.get = function(req, res) {
  console.log("github.get called");
  console.log("User in get: ",req.user);
  console.log("Token in get", req.user.token);

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

// TODO: refactor and abstract number of pages out
exports.getMembers = function(req, res) {
  console.log("github.getMembers called");
  var user = req.user;
  user.orgMembers = [];
  
  github.authenticate({
    type: "oauth",
    token: req.user.token
  });
  console.log("authenticated user!");

  console.log("Requesting page 1 members");
  github.orgs.getMembers({ org: "hackreactor", per_page: 100, page: 1 }, function(err, members) {
    console.log("Got page 1 members! ", members);
    // Push all members to orgMembers array
    members.forEach(function(member) {
      console.log("adding ", member);
      user.orgMembers.push({
        name: member.login,
        repos: []
      });
    });

    // Save data to mongo
    user.save(function(err, user, numberAffected) {
      if (err) console.log("Error saving members to mongo", err);
      else {
        console.log("Page 1 members saved to mongo! ", numberAffected, " entries affected");
      }
    });

    // Do it again for the second page
    console.log("Requesting page 2 members");
    github.orgs.getMembers({ org: "hackreactor", per_page: 100, page: 2 }, function(err, members) {
    console.log("Got page 2 members! ", members);
      
      // Push all page 2 members to orgMembers array
      members.forEach(function(member) {
        console.log("adding ", member);
        user.orgMembers.push({
          name: member.login,
          repos: []
        });
      });

      // Save data to mongo
      user.save(function(err, user, numberAffected) {
        if (err) console.log("Error saving members to mongo", err);
        else {
          console.log("Page 2 members saved to mongo! ", numberAffected, " entries affected");
        }
      });

      res.send(user.orgMembers);
    });
  });
};


/**
 * GET /api/github/members/repos
 * Goes through each member in the authenticated user's orgMembers array and gets all repos associated with each member
 * Stores all repos in user.orgMembers.[[member]].repos array in mongo
 */

// TODO: abstract out per page options, aync
exports.getMemberRepos = function(req, res) {
  console.log("github.getMemberRepos called");
  var user = req.user;
  var members = user.orgMembers;
  var completedRequests = 0;
  
  // Authenticate
  github.authenticate({
    type: "oauth",
    token: req.user.token
  });
  console.log("authenticated user!");

  // For each member, send a request to github for their repos
  members.forEach(function(member) {
    console.log("getting repos for ", member.name);
    member.repos = []; // Reset repos

    var options = {
      user: member.name,
      type: "owner", // Avoid duplicates across groups
      per_page: 100
    };

    github.repos.getFromUser(options, function(err, repos) {
      // Push all repos to mongo
      repos.forEach(function(repo) {
        console.log("adding ", repo, " to ", member.name, "'s repos array");
        member.repos.push({
          name: repo.name,
          stats: []
        });
      });

      // Save data to mongo
      user.save(function(err, user, numberAffected) {
        if (err) console.log("Error saving repos to mongo", err);
        else {
          console.log("repos for ", member.name, " saved to mongo! ", numberAffected, " entries affected");
        }
      });

      // Waits until all repos have been completed until res.send
      if (++completedRequests === members.length) {
        res.send(req.user.orgMembers);
      }
    });
  });

};


