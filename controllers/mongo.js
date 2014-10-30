var User = require("../models/User"); // Maybe eventually use this model to find all users orgMembers

/**
 * Helper functions 
 */

// Parses stringified stats and makes dates usable by javascript
var parseCodeFrequency = function(statString) {
  // Parse string
  var stats = JSON.parse(statString.length > 0 ? statString : "[]");
  stats = Array.isArray(stats) ? stats : []; // Convert the oddball object we get into an array

  // // Format dates (they come in the form [timestamp, lines added, lines deleted])
  // stats.forEach(function(stat) {
  //   stat[0] = new Date(stat[0] * 1000);
  // });

  return stats;
};

/**
 * GET /api/stats/code_frequency
 * Converts all repo's codeFrequency stats stored on user into just those since last Sunday
 * Format for d3 -> [{username, reponame, additions, deletions, net}, ...]
 */

exports.getCodeFrequency = function(req, res) {
  var stats = [];

  // Ignore any members with empty repos
  var filtered = req.user.orgMembers.filter(function(member) {
    return member.repos.length > 0;
  })

  filtered.forEach(function(member) {
    member.repos.forEach(function(repo) {
      parseCodeFrequency(repo.stats.codeFrequency).forEach(function(stat) {
        // codeFrequency stats come in tuples [date, additions, deletions]
        if (stat[0] === 1414281600 && stat[1] > 0 && stat[2] < 0) {
          console.log("found a repo: ", repo.name, " from this week! it adds " , stat[1] , " lines and removes ", stat[2], " lines for a total of ", stat[1] + stat[2], " new lines ");
          stats.push({
            username: member.username,
            repo: repo.name,
            additions: stat[1],
            deletions: stat[2],
            net: stat[1] + stat[2]
          })
        }
      });
    });
  });

  res.send(stats);
}

/**
 * GET /api/stats/punch_card
 * Formats authorized users' orgMembers array into punch card dataset usable by d3
 */

exports.getPunchCard = function(req, res) {
  var user = req.user
  res.send(user.orgMembers);
}