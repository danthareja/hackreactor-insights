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
  var codeFrequency = [];
  var lastWeek = getLastWeek(req.org);
  
  req.org.members.filter(hasRepos).forEach(function(member) {
    member.repos.forEach(function(repo) {
      parseStats(repo.stats.codeFrequency).forEach(function(stat) {
        var date = stat[0];
        var additions = stat[1];
        var deletions = stat[2];
        if (date === lastWeek && (additions > 0 || deletions < 0)) {
          codeFrequency.push({
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

  res.send(codeFrequency);
};


  /**********************************************************************************
   *                         GET /api/stats/punch_card                              *
   *                                                                                *
   * Formats an organization's members array into punch card dataset usable by d3   *
   * Format for d3 -> [{day, hour, commits, repos}, ...]                            *
   **********************************************************************************/

 
exports.getPunchCard = function(req, res) {
  var punchCard = initializePunchCard();
  
  req.org.members.filter(hasRepos).forEach(function(member) {
    member.repos.forEach(function(repo) {
      parseStats(repo.stats.punchCard).forEach(function(stat, i) {
        // punchCard stats come in triples [day, hour, # of commits] and all times are based on the time zone of individual commits
        var commits = stat[2];
        if (commits > 0) {
          punchCard[i].commits += commits;
          punchCard[i].repos.push({
            user: repo.owner,
            repo: repo.name,
            commits: commits
          });
        }
      });
    });
  });

  res.send(punchCard);
};

  /* * * * * * * * * * * * * * * * HELPERS * * * * * * * * * * * * * * * * * */

// Independent of javascript Date() and therefore different server dates. Kind of slow
function getLastWeek(org) {
  return org.members.reduce(function(memo, member) {
    return member.repos.reduce(function(memo, repo){
      var cf = parseStats(repo.stats.codeFrequency);
      var stat = cf[cf.length - 2] || []; // The last full week of codeFrequency stats
      var date = stat[0];
      return date > memo ? date : memo;
    }, 0);
  }, 0);
}

// Github's zero indexed days/hours makes it convenient to initialize in a nested for loop
function initializePunchCard(){
  var punchCard = [];
  for (var day = 0; day < 7; day++) {
    for (var hour = 0; hour < 24; hour++) {
      punchCard.push({
        day: day,
        hour: hour,
        commits: 0,
        repos: []
      });
    }
  }
  return punchCard;
}

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
