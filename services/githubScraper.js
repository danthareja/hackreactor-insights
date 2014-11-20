// TODO: Update entries in mongo instead of wiping them clean every time. 
// TODO: Handle multiple pages (github.nextPage should do it)
var async = require("async");
var mongoose = require("mongoose");
var secret = require("../config/secret");
var GitHubApi = require("github"); // Extended this to add the stats I needed. (https://github.com/mikedeboer/node-github/pull/207)
var Organization = require("../models/Organization");

// Connect to mongo
mongoose.connect(secret.db);
mongoose.connection.on('error', function() {
  console.error('MongoDB Connection Error. Make sure MongoDB is running.');
});

// Instantiate API
var github = new GitHubApi({
  version: "3.0.0"
});

// Authenticate with static token
github.authenticate({
  type: "oauth",
  token: secret.githubToken
});

/**
 * Run block - Compose our steps and run it
 */

var testMe = async.seq(
  getOrganization,
  getAllMembers,
  getAllRepos,
  allDone
);

testMe('hackreactor', function(err, results) {
  console.log('All done!');
});

// github.repos.getFromUser({user: 'aconnelly'}, function(err, data) {
//   console.log(data.meta);
// });


// Helper methods
function saveData(doc, next) {
  console.log('--- Calling saveData ---');
  doc.save(function(err, user, numberAffected) {
    if (err) {
      console.log("Error saving data to mongo", err);
      next('Error saving data to mongo', null);
    }
    else {
      console.log("All data saved to mongo! ", numberAffected, " entries affected. (1 = worked). Moving on to next step..");
      next(null, doc);
    }
  });
}

function queryDatabase(query, callback) {
  console.log('--- Calling queryDatabase ---');
  // Because of the way mongo works, the result will always be an organization here. Maybe rethink this
  Organization.findOne(query, function(err, org) {
    if (err) {
      callback(err, null);
    } else if (org) {
      console.log('At least one result found from query!');
      callback(null, org);
    } else {
      console.log('Zero results found from query'); // Verbose logging
      callback(null, org);
    }
  });
}

// Runs the same GitHub API call while there's still more pages to get then runs the callback on an array of all results
function paginateAndPush(githubFunc, options, callback) {
  console.log('--- Calling paginateAndPush---');
  var result = [];

  (function paginate(page) {
    console.log('--- Calling paginate for page --', page, '---');
    // Add the current page number to our options
    options.page = page;
    githubFunc(options, function(err, data) {
      if (err) {
        callback(err, null);
        return;
      }

      var hasNextPage = github.hasNextPage(data.meta.link); // Handy method provided in our API
      
      // Combine results
      result = result.concat(data);

      if(!hasNextPage) {
        result.meta = data.meta; // Gives us access to the meta outside of paginate
        // When there's no more pages, invoke our callback on the collection of all data
        callback(null, result);
        return;
      }

      // Get data from the next page
      paginate(page + 1);
    });
  })(1); // Kick off our recursion on the first page
}

/**
 * ======= STEP 1 ========
 *
 * Get organization. If the organization does not yet exist in the database, 
 * grab its info from GitHub and create a new entry in the database.
 *
 * Passes an Organization object to the next step
 */

function getOrganization(name, next) {
  console.log('--- Calling getOrganization for', name, '---');
  checkIfOrganizationExists(name, function(err, existingOrg) {
    if (err) {
      next(err, null);
    } else if (existingOrg) {
      next(null, existingOrg); // Move to step 2
    } else {
      addNewOrganization(name, next);
    }
  });
}

/* * *  STEP 1 HELPERS  * * */

function checkIfOrganizationExists(name, callback) {
  console.log('--- Calling checkIfOrganizationExists for', name, '---');
  var query = { username: name };
  queryDatabase(query, callback);
}

function addNewOrganization(name, next) {
  console.log('--- Calling addNewOrganization for', name, '---');
  var options = { org: name };
  github.orgs.get(options, function(err, org) {
    if (err) {
      next(err, null);
    } else {
      console.log('Results returned from github.org.get', org.login);
      var newOrg = createNewOrganization(org);
      saveData(newOrg, next);
    }
  });
}

function createNewOrganization(org) {
  return new Organization({
    username: org.login,
    profile: {
      display_name: org.name,
      url: org.html_url,
      avatar: org.avatar_url,
      location: org.location,
      email: org.email,
      public_repos: org.public_repos,
      public_gists: org.public_gists,
      followers: org.followers,
      following: org.following,
      created_at: org.created_at,
      updated_at: org.updated_at
    }
  });
}

/**
 * ======= STEP 2 ========
 *
 * Get organization members. This will use the organization passed in from step 1 and
 * grab all members associated with the organization from GitHub. If the organization members have changes
 * we will also update them in the database
 *
 * Passes an Organization object to the next step
 */

function getAllMembers(org, next) {
  console.log('--- Calling getAllMembers for', org.username, '---');
  var options = { org: org.username , per_page: 100 };
  
  paginateAndPush(github.orgs.getMembers, options, function(err, allMembers) {
    console.log('Got all members!');
    
    // Update our entries if there are any new members
    if (org.members.length !== allMembers.length) {
      console.log('New members found! Adding them...');
      addNewMembers(org, allMembers, next);
    } else {
      console.log('No new members, moving on to step 3...');
      next(null, org); // Move to step 3
    }
  });
}

/* * *  STEP 2 HELPERS  * * */

function addNewMembers(org, members, next) {
  async.filter(members, isNewMember, function(newMembers) {
    console.log('newMembers back from filter: ', newMembers);
    // newMembers is now only those that didn't exist before in our database
    newMembers.forEach(function(member) {
      console.log('adding new member:', member.login);
      org.members.push({
        username: member.login,
        repos: []
      });
    });
    saveData(org, next); // Move on to step 3
  });
}

// async.filter test function
function isNewMember(member, callback) {
  var query = { "members.username": member.username };
  queryDatabase(query, function(err, org) {
    if (org) {
      callback(false);
    }
    callback(true);
  });
}

/**
 * ======= STEP 3 ========
 *
 * Get member repos. This will use the organization passed in from step 2 and
 * get all repos associated with all members in the organization
 *
 * Passes an Organization object to the next step
 */

function getAllRepos(org, next) {
  async.each(org.members, getReposForMember, goToNextStep);

  function goToNextStep(err) {
    if (err) { next(err, null); }
    saveData(org, next);
  }
}

/* * *  STEP 3 HELPERS  * * */

function getReposForMember(member, callback) {
  var options = {
    user: member.username,
    per_page: 100,
    headers: {
      'If-None-Match': member.etag
    }
  };

  paginateAndPush(github.repos.getFromUser, options, function(err, repos) {
    console.log('Got all repos for member', member.username); // Could come back with a 304 here

    // Update our entries if there are any new repos
    if (repos.length) {
      console.log('New repos found! Adding them...');
      member.etag = repos.meta.etag; // Update etag
      addNewReposToMember(member, repos, callback);
    } else {
      console.log('No new repos, moving on to next user');
      callback(null); // Let async.each know we're done with this iteration
    }
  });
}

function addNewReposToMember(member, repos, callback) {
  async.filter(repos, isNewRepo, function(newRepos) {
    console.log('newRepos back from filter: ', newRepos);
    // newRepos is now only those that didn't exist before in our database
    newRepos.forEach(function(repo) {
      // Janky
      if (repo.name) {
        console.log('adding new repo:', repo.owner.login + '/' + repo.name);
        repo.name && member.repos.push({
          name: repo.name,
          owner: repo.owner.login,
          updated_at: repo.updated_at,
          repos: []
        });
      }
    });
    callback(null); // Let async.each know we're done with this iteration
  });
}

// async.filter test function
function isNewRepo(repo, callback) {
  var query = { "members.username.repos": repo };
  queryDatabase(query, function(err, org) {
    if (org) {
      callback(false);
    }
    callback(true);
  });
}


// // TODO: rethink ++completed requests
// function getMemberRepos(org, callback) {
//   var members = org.members;
//   var completedMembers = 0;
//   var repoCount = 0;

  
//   // For each member, send a request to github for their repos
//   members.forEach(function(member) {

//     var options = {
//       user: member.username,
//       sort: "updated",
//       type: "owner", // Avoid duplicates across groups
//       per_page: 100
//     };

//     // Only repos with a different etag (aka have been changed recently)
//     github.repos.getFromUserAsync(options)
//     .then(function(repos) {
//       member.etag = repos.meta.etag;
//       // Push recently updated repos to mongo
//       repos && repos.forEach(function(repo) {
//         if (wasUpdatedThisWeek(repo)) {
//           console.log("adding ", repo.full_name);
//           member.repos.push({
//             name: repo.name,
//             stats: []
//           });
//           repoCount++; // increment counter on mongo for org.recentlyUpdatedRepoCount
//         }
//       });

//       // Waits until all repos have been completed until saving to DB
//       if (++completedMembers === members.length) {
//         org.recentlyUpdatedRepoCount = repoCount;
//         saveDataToMongo(org, callback);
//       }
//     });
//   });
  
//   function wasUpdatedThisWeek(repo) {
//     var updatedAt = new Date(repo.updated_at);
//     var now = new Date();
//     var lastWeek = new Date(now);
//     lastWeek.setDate(lastWeek.getDate() - 7);

//     return updatedAt > lastWeek && updatedAt < now;
//   }
// }


// /**
//  * ======= STEP 4 ========
//  *
//  * Goes through each repo in the authenticated org's members array and gets all stats associated with each repo
//  * Stores all stats in org.members.[[member]].[[repo]].stats array in mongo
//  * 
//  * This is an expensive call so Github only returns archived data
//  * We have to make the calls twice in order to make sure they are archived. (There's got to be a better way)
//  * NOTE: All stats are stored as a stringified form
//  */

// function getRepoStats(org, callback) {
//   console.log("github.getRepoStats called");
//   var members = org.members;
//   var completedRepos = 0;

  
//   members.forEach(function(member) {
//     // Skip over any member that has no recently updated repos
//     member.repos.length > 0 && member.repos.forEach(function(repo) {
//       var options = {
//         user: member.username,
//         repo: repo.name,
//       };

//       // Get codeFrequency stats
//       github.repos.getStatsCodeFrequencyAsync(options)
//       .then(function(stats) {
//         console.log("repo found! got codeFrequency for member ", member.username, " and repo ", repo.name);
//         repo.stats.codeFrequency = stats;
//       });

//       // Get punchCard stats
//       github.repos.getStatsPunchCardAsync(options)
//       .then(function(stats) {
//         console.log("repo found! got punchCard for member ", member.username, " and repo ", repo.name);
//         repo.stats.punchCard = stats;
//         console.log("number of completed requests down: ", completedRepos + 1);
//         // Save data to mongo when all recently updated repos have been accounted for
//         if (++completedRepos === org.recentlyUpdatedRepoCount) {
//           saveDataToMongo(org, callback);
//         }
//       });
//     });
//   });
// }

/**
 * ======= STEP 5 ========
 *
 * Everything is complete! Shut down mongo
 */

function allDone(org, callback) {
  console.log("Got all github data! Woo! Closing down mongo...");
  mongoose.connection.close();
}

