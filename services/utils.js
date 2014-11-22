var GitHubApi = require("github"); // Extended this to add the stats I needed. (https://github.com/mikedeboer/node-github/pull/207)
var Promise = require("bluebird");
var Organization = require("../models/Organization");

// Instantiate API
var github = new GitHubApi({
  version: "3.0.0"
});

exports.saveData = function(model, next) {
  console.log('--- Calling saveData ---');
  model.save(function(err, user, numberAffected) {
    if (err) {
      console.log("Error saving data to mongo", err);
      next(err, null);
    }
    else {
      console.log("All data saved to mongo! ", numberAffected, " entries affected. Moving on to next step..");
      next(null, model);
    }
  });
};

// Collects all results of a paginated GitHub API call into an array and passes the results to a callback
exports.paginateAndPush = function(githubRequest, options) {
  return new Promise(function(resolve, reject){
    var result = [];
    (function paginate(page) {
      var hasNextPage;

      // Add the current page number to our options
      options.page = page;

      githubRequest(options, function(err, data) {
        if (err) {
          console.log('Error from github inside paginate: ', err.message);
          reject(err);
          return;
        }

        var hasNextPage = github.hasNextPage(data.meta.link); // Handy method provided in our API
        
        result = result.concat(data);

        if(!hasNextPage) {
          // Gives us access to the meta outside of paginate
          result.meta = data.meta;
          // When there's no more pages, resolve our promise with the collection of all data
          resolve(result);
          return;
        }

        // Get data from the next page
        paginate(page + 1);
      });
    })(1); // Kick off our recursion on the first page
  });
};
