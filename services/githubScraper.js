var Promise = require("bluebird");
var mongoose = Promise.promisifyAll(require("mongoose"));
var async = require("async");
var secret = require("../config/secret");
var github = require("./githubScraperHelpers");

// Connect to mongo
mongoose.connect(secret.db);
mongoose.connection.on('error', function() {
  console.error('MongoDB Connection Error. Make sure MongoDB is running.');
});

// Run our helper methods
github.getOrganization('hackreactor')
.then(github.getAllMembers)
.then(github.getAllRepos)
.then(github.getAllStats)
.then(closeMongoose)
.catch(handleError);

function closeMongoose(org) {
  console.log("Got all github data for", org.username, "! Woo!");
  console.log("Closing mongoose..");
  mongoose.connection.close();
}

function handleError(err) {
  console.log("Broke out of promise chain");
  console.log("Error: ", err);
  console.log("Closing mongoose..");
  mongoose.connection.close();
}