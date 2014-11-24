var Organization = require("../models/Organization");

// Middleware that handles database lookup
exports.getOrganization = function(req, res, next) {
  // Allow users to send custom org over query string
  org = req.query.org || 'hackreactor';
  console.log('getting organization data for ', org);
  Organization.findOne({ username: org }, function(err, existingOrg) {
    if (existingOrg) {
      // Pass on reference to the existing org
      req.org = existingOrg;
      next();
    } else {
      res.status(404).end();
    }
  });
};


  /**********************************************************************************
   *                         GET /api/stats/code_frequency                          *
   *                                                                                *
   * Converts all repo's codeFrequency stats into just those since last Sunday      *
   * Format for d3 -> [{username, repo_name, additions, deletions, net}, ...]       *
   **********************************************************************************/


exports.getCodeFrequency = function(req, res) {
  var stats = [];

  req.org.members.filter(hasRepos).forEach(function(member) {
    member.repos.forEach(function(repo) {
      parseStats(repo.stats.codeFrequency).forEach(function(stat) {
        var date = stat[0];
        var additions = stat[1];
        var deletions = stat[2];
        if (isLastSunday(date) && (additions > 0 || deletions < 0)) {
          console.log("found a repo:", repo.name, " from this week! it adds " , additions , " lines and removes ", deletions, " lines for a total of ", additions + deletions, " new lines ");
          stats.push({
            username: repo.owner,
            repo: repo.name,
            additions: additions,
            deletions: -deletions,
            net: additions + deletions
          });
        }
      });
    });
  });

  res.send(stats);

   // GitHub Punch card dates each week starting with Sunday, 0:00:00 UTC.
  function isLastSunday(date) {
    var now = new Date();
    // Handle any timezone that new Date() is created in
    var todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    var sundayUTC = new Date(todayUTC.setDate(todayUTC.getDate()-todayUTC.getDay()-8));
    return date === sundayUTC.getTime() / 1000;
  }
};


  /**********************************************************************************
   *                         GET /api/stats/punch_card                              *
   *                                                                                *
   * Formats an organization's members array into punch card dataset usable by d3   *
   * Format for d3 -> [{day, hour, commits, repos}, ...]                            *
   **********************************************************************************/

 
exports.getPunchCard = function(req, res) {
  var stats = initializeStats();

  req.org.members.filter(hasRepos).forEach(function(member) {
    member.repos.forEach(function(repo) {
      parseStats(repo.stats.punchCard).forEach(function(stat, i) {
        // punchCard stats come in triples [day, hour, # of commits]
        var commits = stat[2];
        if (commits > 0) {
          console.log("found a repo:", repo.owner, "/", repo.name, "from this week! at day " , stat[0] , " hour ", stat[1], " with number of commits: ", stat[2]);
          stats[i].commits += commits;
          stats[i].repos.push({
            user: repo.owner,
            repo: repo.name,
            commits: commits
          });
        }
      });
    });
  });

  res.send(stats);

  // Github's zero indexed days/hours makes it convenient to initialize in a nested for loop
  function initializeStats(){
    var stats = [];
    for (var day = 0; day < 7; day++) {
      for (var hour = 0; hour < 24; hour++) {
        stats.push({
          day: day,
          hour: hour,
          commits: 0,
          repos: []
        });
      }
    }
    return stats;
  }
};

  /* * * * * * * * * * * * * * * * HELPERS * * * * * * * * * * * * * * * * * */

function parseStats(statString) {
  // Every so often, GitHub gives us an undefined, just return out with an empty array
  if (!statString) return [];
  // If there's nothing there, we'll just assign it to an empty array
  var stats = JSON.parse(statString.length > 0 ? statString : "[]");

  // Every so often, we get an Object instead of an Array from Github. The rest of our code expects arrays
  return Array.isArray(stats) ? stats : [];
}

function hasRepos(member) {
  return member.repos.length > 0;
}
