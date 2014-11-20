var async = require("async");
var secret = require("../config/secret");
var utils = require("./utils");
var GitHubApi = require("github"); // Extended this to add the stats I needed. (https://github.com/mikedeboer/node-github/pull/207)
var Organization = require("../models/Organization");

// Instantiate API
var github = new GitHubApi({
  version: "3.0.0"
});

// Authenticate with static token
github.authenticate({
  type: "oauth",
  token: secret.githubToken
});

// // TEST
// var options = {user: 'asdlkfjasdfdf'};
// utils.paginateAndPush(github.repos.getFromUser, options, function(err, repos) {
//   if (err) {
//     console.log('Error getting scraping all data: ',err);
//   } else {
//     console.log("Got all github data! Woo!");
//   }
//   console.log("Shutting down...");
// });


/**
 * ======= STEP 1 ========
 *
 * Get organization. If the organization does not yet exist in the database, 
 * grab its info from GitHub and create a new entry in the database.
 *
 * Passes an Organization object to the next step
 */

exports.getOrganization = function(name, next) {
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
};

/* * *  STEP 1 HELPERS  * * */

function checkIfOrganizationExists(name, callback) {
  console.log('--- Calling checkIfOrganizationExists for', name, '---');
  var query = { username: name };
  utils.queryDatabase(query, callback);
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
      utils.saveData(newOrg, next);
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

exports.getAllMembers = function(org, next) {
  console.log('--- Calling getAllMembers for', org.username, '---');
  getMembersForOrg(org, next);
};

/* * *  STEP 2 HELPERS  * * */

function getMembersForOrg(org, next) {
  var options = { org: org.username , per_page: 100 };
  utils.paginateAndPush(github.orgs.getMembers, options, function(err, allMembers) {
    if (err) {
      console.log('Error getting data from github', error);
      next(err, null);
    }

    console.log('Got all members!');

    // Update our entries if there are any new members
    if (membersHaveChanged(org, allMembers)) {
      console.log('New members found! Adding them...');
      addNewMembers(org, allMembers, next);
    } else {
      console.log('No new members, moving on to step 3...');
      next(null, org); // Move to step 3
    }
  });
}

// Maybe there's some more logic here. It's kind of dumb right now
function membersHaveChanged(org, members) {
  return org.members.length !== members.length;
}

function addNewMembers(org, members, next) {
  async.filter(members, isNewMember, function(newMembers) {
    console.log('newMembers back from filter: ', newMembers);

    // newMembers now only contain those that didn't exist before in our database
    newMembers.forEach(function(member) {
      console.log('adding new member:', member.login);
      org.members.push(createNewMember(member));
    });

    utils.saveData(org, next); // Save new members and move on to step 3
  });

  // async.filter test function. Requires a callback as the second argument, if true is passed
  // into the callback, the item is added to the filtered array, if false is passed into the callback, the item is left out of the filtered array
  function isNewMember(member, shouldBePushed) {
    var isNew = org.members.every(function(existingMember) {
      return existingMember.username !== member.login;
    });
    console.log(member.login,'is new?',isNew);
    isNew ? shouldBePushed(true) : shouldBePushed(false);
  }
}


function createNewMember(member) {
  return {
    username: member.login,
    repos: []
  };
}

/**
 * ======= STEP 3 ========
 *
 * Get member repos. This will use the organization passed in from step 2 and
 * get all repos associated with all members in the organization
 *
 * Passes an Organization object to the next step
 */

exports.getAllRepos = function(org, next) {
  async.each(org.members, getReposForMember, goToNextStep);

  function goToNextStep(err) {
    if (err) { next(err, null); }
    else { utils.saveData(org, next); }
  }
};

/* * *  STEP 3 HELPERS  * * */

// async.each iterator. Expects a callback as the second argument that must be called either with an error if there was one or null once the iteration is done
function getReposForMember(member, doneWithAsyncIterator) {
  var options = {
    user: member.username,
    per_page: 100,
    headers: {
      // Preflight with an etag. If the etag hasn't changed, the call will return with a 304 and not count against our rate limit
      'If-None-Match': member.etag
    }
  };

  // Reurns with an empty array if etag was the same, or all repos for a user
  utils.paginateAndPush(github.repos.getFromUser, options, function(err, repos) {
    if (err) {
      console.log('Error getting data from github', err);
      // If I pass along the err here, it will bubble all the way out and stop everything. Right now I'm just skipping over it. Is there a better way to do this?
      doneWithAsyncIterator(null);

    } else {
      console.log('Got all repos for member', member.username);
      console.log('meta:', repos.meta.status);
      console.log('length:', repos.length);

      // Update our entries if there are any new repos
      if (repos.length) {
        console.log('Etag changed! Checking if any of them returned repos are new for', member.username);
        member.etag = repos.meta.etag; // Update etag
        addNewReposToMember(member, repos, doneWithAsyncIterator);
      } else {
        console.log('No new repos, moving on to next user');
        doneWithAsyncIterator(null);
      }
    }
  });
}

function addNewReposToMember(member, repos, doneWithAsyncIterator) {
  // This is a really slow filter process right now
  async.filter(repos, isNewRepo, function(newRepos) {
    console.log('newRepos for', member.username, 'back from filter:', newRepos.length);
    // newRepos is now only those that didn't exist before in our database
    newRepos.forEach(function(repo) {
      console.log('adding new repo:', repo.owner.login + '/' + repo.name);
      member.repos.push(createNewRepo(repo));
    });
    doneWithAsyncIterator(null); // Let async.each know we're done with this iteration
  });

  // async.filter test function
  function isNewRepo(repo, shouldBePushed) {
    var isNew = member.repos.every(function(existingRepo) {
      return existingRepo.name !== repo.name;
    });
    console.log(repo.name,'is new?',isNew);
    isNew ? shouldBePushed(true) : shouldBePushed(false);
  }
}


function createNewRepo(repo) {
  return {
    name: repo.name,
    owner: repo.owner.login,
    updated_at: repo.updated_at,
    stats: {
      codeFrequency: '',
      punchCard: '',
      commitActivity: '',
    }
  };
}


// /**
//  * ======= STEP 4 ========
//  *
//  * Goes through each repo in the org's members array and gets all stats associated with each repo
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
//           utils.saveDataToMongo(org, callback);
//         }
//       });
//     });
//   });
// }