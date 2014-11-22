var async = require("async");
var secret = require("../config/secret");
var utils = require("./utils");
var GitHubApi = require("github"); // Extended this to add stats routes. Yay opensource! (https://github.com/mikedeboer/node-github/pull/207)
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


/**********************************************************************************
 *                                  STEP 1                                        *
 *                                                                                *
 * Get organization.                                                              *
 * Grab data from GitHub and create new entry if organization does not exist yet  *
 *                                                                                *
 * Resolves with an organization Object.                                          *
 **********************************************************************************/


exports.getOrganization = function(name) {
  console.log('--- Calling getOrganization for', name, '---');
  return new Promise(function(resolve, reject) {
    var query = { username: name };
    Organization.findOneAsync(query)
    .then(function(org) {
      org ? resolve(org) : addNewOrganization(name, resolve, reject);
    });
  });
};

/* * * * * * * * * * * * * * * * STEP 1 HELPERS * * * * * * * * * * * * * * * * * */

function addNewOrganization(name, resolve, reject) {
  console.log('--- Calling addNewOrganization for', name, '---');
  var options = { org: name };
  github.orgs.getAsync(options)
  .then(function(org) {
    console.log('Results returned from github.org.get', org.login);
    var newOrg = createNewOrganization(org);
    utils.saveData(newOrg, resolve, reject);
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


/**********************************************************************************
 *                                  STEP 2                                        *
 *                                                                                *
 * Get all members associated with the organization from GitHub.                  *
 * If the organization members have changed at all, we will add the new ones.     *
 *                                                                                *
 * Resolves with an organization Object.                                          *
 **********************************************************************************/


exports.getAllMembers = function(org) {
  console.log('--- Calling getAllMembers for', org.username, '---');
  return new Promise(function(resolve, reject) {
    var options = { org: org.username , per_page: 100 };

    utils.paginateAndPush(github.orgs.getMembers, options)
    .then(function(allMembers){
      console.log('Got all members', allMembers.length);
      if (membersHaveChanged(org, allMembers)) {
        console.log('New members found! Adding them...');
        updateMembers(org, allMembers, resolve, reject);
      } else {
        console.log('No new members, moving on to step 3...');
        resolve(org);
      }
    });
  });
};

/* * * * * * * * * * * * * * * * STEP 2 HELPERS * * * * * * * * * * * * * * * * * */

function membersHaveChanged(org, members) {
  return org.members.length !== members.length;
}

function updateMembers(org, members, resolve, reject) {
  async.filter(members, isNewMember, addNewMembers);

  function isNewMember(member, shouldBePushed) {
    var isNew = org.members.every(function(existingMember) {
      return existingMember.username !== member.login;
    });
    console.log(member.login,'is new?',isNew);
    isNew ? shouldBePushed(true) : shouldBePushed(false);
  }

  function addNewMembers(newMembers) {
    console.log('newMembers back from filter: ', newMembers.length);
    newMembers.forEach(createNewMember);
    utils.saveData(org, resolve, reject);
  }

  function createNewMember(member) {
    var newMember = {
      username: member.login,
      repos: []
    };
    console.log('adding new member:', member.login);
    org.members.push(newMember);
  }
}


/**********************************************************************************
 *                                  STEP 3                                        *
 *                                                                                *
 * Get all repos for each member in the organization.                             *
 * Preflight calls with 'If-None-Match' header to avoid rate limits.              *
 * Only saves repos that have been updated in the last month.                     *
 *                                                                                *
 * Resolves with an organization Object.                                          *
 **********************************************************************************/


exports.getAllRepos = function(org) {
  return new Promise(function(resolve, reject) {
    async.each(org.members, getReposForMember, goToNextStep);

    function goToNextStep(err) {
      err ? reject(err) : utils.saveData(org, resolve, reject);
    }
  });
};

/* * * * * * * * * * * * * * * * STEP 3 HELPERS * * * * * * * * * * * * * * * * * */

function getReposForMember(member, done) {
  var options = {
    user: member.username,
    per_page: 100,
    headers: {
      // Will return with a 304 and not count against our rate limit if no changes
      'If-None-Match': member.etag
    }
  };

  utils.paginateAndPush(github.repos.getFromUser, options)
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


/**********************************************************************************
 *                                  STEP 4                                        *
 *                                                                                *
 * Get all stats for each repos associated for every member.                      *
 * GitHub returns cached stats. Might have to call twice the first time.          *
 * All stats are stringified before storage.                                      *
 *                                                                                *
 * Resolves with an organization Object.                                          *
 **********************************************************************************/


exports.getAllStats = function(org) {
  return new Promise(function(resolve, reject) {
   async.each(org.members, getStatsForMember, goToNextStep);

    function goToNextStep(err) {
      err ? reject(err) : utils.saveData(org, resolve, reject);
    }
  });
};

/* * * * * * * * * * * * * * * * STEP 4 HELPERS * * * * * * * * * * * * * * * * * */

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

