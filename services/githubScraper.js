var async = require("async");
var mongoose = require("mongoose");
var secret = require("../config/secret");
var github = require("./githubScraperHelpers");

// Connect to mongo
mongoose.connect(secret.db);
mongoose.connection.on('error', function() {
  console.error('MongoDB Connection Error. Make sure MongoDB is running.');
});

// Run block - Compose our steps and run it
var scrapeGitHub = async.seq(
  github.getOrganization,
  github.getAllMembers,
  github.getAllRepos,
  github.getAllStats
);

scrapeGitHub('hackreactor', function(err, results) {
  if (err) {
    console.log('Error getting scraping all data: ',err);
  } else {
    console.log("Got all github data! Woo!");
  }
  console.log("Closing down mongo...");
  mongoose.connection.close();
});
