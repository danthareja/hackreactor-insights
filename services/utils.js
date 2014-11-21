var Organization = require("../models/Organization");
var GitHubApi = require("github"); // Extended this to add the stats I needed. (https://github.com/mikedeboer/node-github/pull/207)

// Instantiate API
var github = new GitHubApi({
  version: "3.0.0"
});

exports.saveData = function(doc, next) {
  console.log('--- Calling saveData ---');
  doc.save(function(err, user, numberAffected) {
    if (err) {
      console.log("Error saving data to mongo", err);
      next('Error saving data to mongo', null);
    }
    else {
      console.log("All data saved to mongo! ", numberAffected, " entries affected. Moving on to next step..");
      next(null, doc);
    }
  });
};

exports.queryDatabase = function(query, callback) {
  console.log('--- Calling queryDatabase ---');
  // Mongo will always return an organization here. This isn't effecient for querying nested documents (i.e. repos)
  Organization.findOne(query, function(err, org) {
    if (err) {
      callback(err, null);
    } else if (org) {
      console.log('At least one result found from query!');
      callback(null, org);
    } else {
      console.log('Zero results found from query');
      callback(null, org);
    }
  });
};

// Runs the same GitHub API call passed in as the first argument while there's still more pages to get then runs the callback on an array of all results
exports.paginateAndPush = function(githubCall, options, callback) {
  var result = [];

  (function paginate(page) {
    // Add the current page number to our options
    options.page = page;
    githubCall(options, function(err, data) {
      if (err) {
        console.log('Error from github inside paginate: ', err.message);
        callback(err, null);
        return;
      }

      var hasNextPage = github.hasNextPage(data.meta.link); // Handy method provided in our API
      
      // Combine results only if modified. Maybe unnecessary
      if (data.meta.status !== '304 Not Modified') {
        result = result.concat(data);
      }

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
};
