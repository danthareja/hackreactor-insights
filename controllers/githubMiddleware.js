// TODO: Error handling. res.send errors along the way of the middleware
var Promise = require("bluebird");
var http = require("request");
var GitHubApi = require("github");

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
 * Promisify API
 */

Promise.promisifyAll(github);
Promise.promisifyAll(github.user);
Promise.promisifyAll(github.orgs);
Promise.promisifyAll(github.repos);
Promise.promisifyAll(github.repos.stats);

/**
 * Helper functions 
 */

// Authenticate user 
var authenticate = function(user) {
 github.authenticate({
   type: "oauth",
   token: user.token
 });
 console.log("authenticated user!");
};

// Save data to mongo
var saveData = function(req, res, next) {
  req.user.save(function(err, user, numberAffected) {
    if (err) console.log("Error saving data to mongo", err);
    else {
      console.log("All data saved to mongo! ", numberAffected, " entries affected");
      // Go to next step
      next();
    }
  });
};

/**
 * ======= STEP 1 ========
 *
 * Gets both hidden and public memberships in Hack Reactor for currently authenticated user.
 * Stores all members in user.orgMembers array in Mongo
 */

exports.getMembers = function(req, res, next) {
  var user = req.user;
  var pages = 2;
  user.orgMembers = [];

  authenticate(user);
  getGithubMembers();

  // Gets all the members in order to completion, then saves data
  function getGithubMembers(page) {
    page = page || 1;
    // After all members gotten, save the data and send a response
    if (page > pages) {
      saveData(req, res, next);
    } else {
      console.log("Requesting page ", page, " members");
      github.orgs.getMembersAsync({ org: "hackreactor", per_page: 100, page: page})
      .then(function(members) {
        members.forEach(function(member) {
          console.log("adding ", member.login);
          user.orgMembers.push({
            username: member.login,
            repos: []
          });
        });
        // Recursively call with the next page until we reach set page number above
        getGithubMembers(page + 1);
      });
    }
  }
};


/**
 * ======= STEP 2 ========
 *
 * Goes through each member in the authenticated user's orgMembers array and gets all repos associated with each member
 * Stores ONLY REPOS UPDATED IN THE LAST WEEK in user.orgMembers.[[member]].repos array in mongo. NOTE: Update does not mean a commit was made
 */

// TODO: rethink ++completed requests
exports.getMemberRepos = function(req, res, next) {
  var user = req.user;
  var members = user.orgMembers;
  var completedMembers = 0;
  var repoCount = 0;

  authenticate(user);
  
  // For each member, send a request to github for their repos
  members.forEach(function(member) {
    member.repos = []; // Reset repos

    var options = {
      user: member.username,
      sort: "updated",
      type: "owner", // Avoid duplicates across groups
      per_page: 100
    };

    github.repos.getFromUserAsync(options)
    .then(function(repos) {
      // Push recently updated repos to mongo
      repos && repos.forEach(function(repo) {
        if (wasUpdatedThisWeek(repo)) {
          console.log("adding ", repo.full_name);
          member.repos.push({
            name: repo.name,
            stats: []
          });
          repoCount++; // increment counter on mongo for user.repoCount
        }
      });

      // Waits until all repos have been completed until saving to DB
      if (++completedMembers === members.length) {
        user.recentlyUpdatedRepoCount = repoCount;
        saveData(req, res, next);
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
 * ======= STEP 3 ========
 *
 * Goes through each repo in the authenticated user's orgMembers array and gets all stats associated with each repo
 * Stores all stats in user.orgMembers.[[member]].[[repo]].stats array in mongo
 * 
 * This is an expensive call so Github only returns archived data
 * We have to make the calls twice in order to make sure they are archived. (There's got to be a better way)
 * NOTE: All stats are stored as a stringified form
 */

exports.getRepoStats = function(req, res, next) {
  console.log("github.getRepoStats called");
  var user = req.user;
  var members = user.orgMembers;
  var completedRepos = 0;

  authenticate(user);
  
  members.forEach(function(member) {
    // Skip over any member that has no recently updated repos
    member.repos.length > 0 && member.repos.forEach(function(repo) {
      var options = {
        username: member.username,
        repo: repo.name,
        token: user.token
      }

      // Get codeFrequency stats
      github.repos.stats.codeFrequencyAsync(options)
      .then(function(stats) {
        console.log("repo found! got codeFrequency for member ", member.username, " and repo ", repo.name);
        repo.stats.codeFrequency = stats;
      });

      // Get punchCard stats
      github.repos.stats.punchCardAsync(options)
      .then(function(stats) {
        console.log("repo found! got punchCard for member ", member.username, " and repo ", repo.name);
        repo.stats.punchCard = stats;
        console.log("number of completed requests down: ", completedRepos + 1);
        // Save data to mongo when all recently updated repos have been accounted for
        if (++completedRepos === user.recentlyUpdatedRepoCount) {
          saveData(req, res, next);
        }
      });
    });
  });
};

/**
 * ======= STEP 4 ========
 *
 * Everything is complete! Send a success response
 */

exports.sendResponse = function(req, res) {
  console.log("Got all github data! Woo!")
  res.send(200); // Maybe redirect to homepage
};

