var async = require("async");
var secret = require("../config/secret");
var utils = require("./utils");
var GitHubApi = require("github"); // Extended this to add the stats I needed. (https://github.com/mikedeboer/node-github/pull/207)
var Organization = require("../models/Organization");
var Promise = require("bluebird");

// Instantiate API
var github = new GitHubApi({
  version: "3.0.0"
});

// Authenticate with static token
github.authenticate({
  type: "oauth",
  token: secret.githubToken
});

Promise.promisifyAll(github.orgs);
Promise.promisifyAll(github.repos);

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
  var query = { username: name };
  Organization.findOneAsync(query)
  .then(function(org) {
    org ? next(null, org) : addNewOrganization(name, next);
  });
};

/* * *  STEP 1 HELPERS  * * */

function addNewOrganization(name, next) {
  console.log('--- Calling addNewOrganization for', name, '---');
  var options = { org: name };
  github.orgs.getAsync(options)
  .then(function(org) {
    console.log('Results returned from github.org.get', org.login);
    var newOrg = createNewOrganization(org);
    utils.saveData(newOrg, next);
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
  var options = { org: org.username , per_page: 100 };

  utils.paginateAndPush(github.orgs.getMembers, options)
  .then(function(allMembers){
    // Update our entries if there are any new members
    if (membersHaveChanged(org, allMembers)) {
      console.log('New members found! Adding them...');
      updateMembers(org, allMembers, next);
    } else {
      console.log('No new members, moving on to step 3...');
      next(null, org);
    }
  });
};

/* * *  STEP 2 HELPERS  * * */

function membersHaveChanged(org, members) {
  return org.members.length !== members.length;
}

function updateMembers(org, members, next) {
  async.filter(members, isNewMember, addNewMembers);

  // async.filter test function. Requires a callback as the second argument, if true is passed
  // into the callback, the item is added to the filtered array, if false is passed into the callback, the item is left out of the filtered array
  function isNewMember(member, shouldBePushed) {
    var isNew = org.members.every(function(existingMember) {
      return existingMember.username !== member.login;
    });
    console.log(member.login,'is new?',isNew);
    isNew ? shouldBePushed(true) : shouldBePushed(false);
  }

  function addNewMembers(newMembers) {
    console.log('newMembers back from filter: ', newMembers);
    // newMembers now only contain those that didn't exist before in our database
    newMembers.forEach(createNewMember);
    utils.saveData(org, next);
  }
}

function createNewMember(member) {
  var newMember = {
    username: member.login,
    repos: []
  };
  console.log('adding new member:', member.login);
  org.members.push(newMember);
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
    err ? next(err, null) : utils.saveData(org, next);
  }
};

/* * *  STEP 3 HELPERS  * * */

// async.each iterator
function getReposForMember(member, done) {
  var options = {
    user: member.username,
    per_page: 100,
    headers: {
      // Preflight with an etag. If the etag hasn't changed, the call will return with a 304 and not count against our rate limit
      'If-None-Match': member.etag
    }
  };

  utils.paginateAndPush(github.repos.getFromUser, options)
  // Returns with an empty array if etag was the same, or all repos for a user
  .then(function(repos) {
    if (repos.length) {
      console.log('Etag changed for', member.username,'! Checking if any of the returned repos are new..');
      member.etag = repos.meta.etag; // Update etag
      updateReposForMember(member, repos, done);
    } else {
      console.log('No new repos for', member.username, 'moving on to next user');
      done(null);
    }
  });
}

function updateReposForMember(member, repos, done) {
  async.filter(repos, isNewAndCurrentRepo, addNewAndCurrentRepos);

  function isNewAndCurrentRepo(repo, shouldBePushed) {
    var isCurrent = hasBeenUpdatedInLastMonth(repo);
    var isNew = member.repos.every(function(existingRepo) {
      return existingRepo.name !== repo.name;
    });

    isNew && isCurrent? shouldBePushed(true) : shouldBePushed(false);
  }

  function addNewAndCurrentRepos(newRepos) {
    console.log('newRepos for', member.username, 'back from filter:', newRepos.length);
    newRepos.forEach(createNewRepo);
    done(null);
  }

  function createNewRepo(repo) {
    var newRepo = {
      name: repo.name,
      owner: repo.owner.login,
      // Guarentee that the first comparison is true by being later than 271,821 B.C.
      updated_at: new Date(-8640000000000000).toGMTString(),
      stats: {
        codeFrequency: '',
        punchCard: '',
        commitActivity: '',
      }
    };
    console.log('adding new repo:', newRepo.owner + '/' + newRepo.name);
    member.repos.push(newRepo);
  }
}

function hasBeenUpdatedInLastMonth(repo) {
  var today = new Date();
  var lastMonth = today.setMonth(today.getMonth() - 1);
  var lastUpdated = new Date(repo.updated_at);
  return lastUpdated > lastMonth;
}



/**
 * ======= STEP 4 ========
 *
 * Goes through each repo in the org's members array and gets all stats associated with each repo
 * Stores all stats in org.members.[[member]].[[repo]].stats array in mongo
 * 
 * This is an expensive call so Github only returns archived data
 * We have to make the calls twice in order to make sure they are archived. (There's got to be a better way)
 * NOTE: All stats are stored as a stringified form
 */

exports.getAllStats = function(org, next) {
 async.each(org.members, getStatsForMember, goToNextStep);

  function goToNextStep(err) {
    err ? next(err, null) : utils.saveData(org, next);
  }
};

/* * *  STEP 4 HELPERS  * * */

function getStatsForMember(member, done) {
  async.filter(member.repos, hasChangedSinceLastScrape, updateStats);

  function updateStats(repos){
    console.log(member.username, 'has', repos.length, 'recently updated repos.');
    if (repos.length) {
      async.each(repos, getStatsForRepo, function(){
        done(null);
      });
    } else {
      done(null);
    }
  }
}

function hasChangedSinceLastScrape(repo, shouldBePushed){
  var options = {
    user: repo.owner,
    repo: repo.name,
    headers: {
      // Preflight with update_at. If the repo hasn't been updated, the call will return with a 304 and not count against our rate limit
      'If-Modified-Since': repo.updated_at
    }
  };

  github.repos.getAsync(options)
  .then(function(results) {
    if (results.meta.status === '304 Not Modified') {
      shouldBePushed(false);
    } else {
      // Update last modified date
      repo.updated_at = results.meta['last-modified'];
      shouldBePushed(true);
    }
  });
}

function getStatsForRepo(repo, done) {
  var options = {
    user: repo.owner,
    repo: repo.name
  };

  github.repos.getStatsCodeFrequencyAsync(options)
  .then(function(stats) {
    console.log('got codeFrequency for', repo.owner + '/' + repo.name);
    repo.stats.codeFrequency = JSON.stringify(stats);
  })
  .then(function(){
    github.repos.getStatsPunchCardAsync(options)
    .then(function(stats) {
      repo.stats.punchCard = JSON.stringify(stats);
      console.log('got punchCard for', repo.owner + '/' + repo.name);
      done(null);
    })
    .catch(function(){
      done(null);
    });
  })
  .catch(function() {
    done(null);
  });
}

