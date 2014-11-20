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
  getOrganizationMembers,
  allDone
);

testMe('hackreactor', function(err, res) {
  console.log('All done!');
});

// testMe('hackreactor', function(err, results) {
//   console.log('All done!');
// });

// Helper methods
function saveDataToDatabase(doc, callback) {
  console.log('--- Calling saveDataToDatabase ---');
  doc.save(function(err, user, numberAffected) {
    if (err) {
      console.log("Error saving data to mongo", err);
      callback('Error saving data to mongo', null);
    }
    else {
      console.log("All data saved to mongo! ", numberAffected, " entries affected. (1 = worked)");
      callback(null, doc);
    }
  });
}

function queryDatabase(query, callback) {
  console.log('--- Calling queryDatabase ---');
  Organization.findOne(query, function(err, results) {
    if (err) {
      callback(err, null);
    } else if (results) {
      console.log('At least one result found from query!');
      callback(null, results);
    } else {
      console.log('Zero results found from query'); // Verbose logging
      callback(null, results);
    }
  });
}

/**
 * ======= STEP 1 ========
 *
 * Get organization. If the organization does not yet exist in the database, 
 * grab its info from GitHub and create a new entry in the database.
 *
 * Passes an Organization object to the next step
 */

function getOrganization(name, callback) {
  console.log('--- Calling getOrganization for', name, '---');
  checkIfOrganizationExistsInDatabase(name, function(err, existingOrg) {
    if (err) {
      callback(err, null);
    } else if (existingOrg) {
      callback(null, existingOrg);
    } else {
      addNewOrganizationToDatabase(name, callback);
    }
  });
}

/* * *  STEP 1 HELPERS  * * */

function checkIfOrganizationExistsInDatabase(name, callback) {
  console.log('--- Calling checkIfOrganizationExistsInDatabase for', name, '---');
  var query = { username: name };
  queryDatabase(query, callback);
}

function addNewOrganizationToDatabase(name, callback) {
  console.log('--- Calling addNewOrganizationToDatabase for', name, '---');
  var options = { org: name };
  github.orgs.get(options, function(err, org) {
    if (err) {
      callback(err, null);
    } else {
      console.log('Results returned from github.org.get', org.login);
      var newOrg = createNewOrganization(org);
      saveDataToDatabase(newOrg, callback);
    }
  });
}

function createNewOrganization(options) {
  return new Organization({
    username: options.login,
    profile: {
      display_name: options.name,
      url: options.html_url,
      avatar: options.avatar_url,
      location: options.location,
      email: options.email,
      public_repos: options.public_repos,
      public_gists: options.public_gists,
      followers: options.followers,
      following: options.following,
      created_at: options.created_at,
      updated_at: options.updated_at
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

function getOrganizationMembers(org, callback) {
  console.log('--- Calling getOrganizationMembers for', org.username, '---');
  var options = { org: org.username , per_page: 30 };
  
  paginateAndPush(github.orgs.getMembers, options, function(err, allMembers) {
    console.log('Got all members!', allMembers);
  });
}

/* * *  STEP 2 HELPERS  * * */

// Runs the same GitHub API call while there's still more pages to get then runs the callback on an array of all results
function paginateAndPush(githubFunc, options, callback) {
  console.log('--- Calling paginateAndPush---');
  // Holds results of all our paginated calls in closure scope
  var result = [];

  (function paginate(page) {
    console.log('--- Calling paginate for page --', page, '---');
    // Add the current page number to our options
    options.page = page;
    githubFunc(options, function(err, data) {
      console.log('Github call returned!');
      if (err) {
        callback(err, null);
        return;
      }

      var hasNextPage = github.hasNextPage(data.meta.link); // Handy method provided in our API
      
      // Combine results
      console.log('combining results - before', result.length);
      result = result.concat(data);
      console.log('combining results - after', result.length);

      if(!hasNextPage) {
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
 * ======= STEP 3 ========
 *
 * Gets both hidden and public memberships in Hack Reactor for currently authenticated user.
 */

function getMembers(org, callback) {
  var page = 1;
  var options = { org: "hackreactor", per_page: 100, page: page };
  github.orgs.getMembers(options, function(err, members) {
    console.log('members', members);
    console.log('meta', members.meta);
    console.log('next page? ', github.hasNextPage(members.meta.link));
    callback(null, members);
  });
}

 /**
  * ======= STEP 4 ========
  *
  * Stores all members in user.members array in Mongo
  */
// function getMembers(org, callback) {
//   var pages = 2; // TODO: Figure out how to not hard code this

//   getGithubMembers();

//   // Gets all the members in order to completion, then saves data
//   function getGithubMembers(page) {
//     page = page || 1;
//     // After all members gotten, save the data and send a response
//     if (page > pages) {
//       saveDataToMongo(org, callback);
//     } else {
//       console.log("Requesting page ", page, " members");
//       github.orgs.getMembersAsync({ org: "hackreactor", per_page: 100, page: page})
//       .then(function(members) {
//         var memberCount = 0;
//         members.forEach(function(member) {
//           // Only add members if they don't exist yet
//           Organization.findOne({"members.username": member.login}, function(err, existingUser) {
//             if (!existingUser) {
//               console.log("adding ", member.login);
//               org.members.push({
//                 username: member.login,
//                 repos: []
//               });
//             } else { console.log(member.login, "already exists in the database"); }
//             // Recursively call with the next page until we reach set page number above
//             if (++memberCount === members.length) {
//               getGithubMembers(page + 1);
//             }
//           });
//         });
//       });
//     }
//   }
// }


// /**
//  * ======= STEP 3 ========
//  *
//  * Goes through each member in the authenticated user's members array and gets all repos associated with each member
//  * Stores ONLY REPOS UPDATED IN THE LAST WEEK in user.members.[[member]].repos array in mongo. NOTE: Update does not mean a commit was made
//  */

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

