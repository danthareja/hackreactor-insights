/**
 * Module dependencies.
 */

var express = require("express");
var cors = require("cors");
var morgan = require("morgan");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var methodOverride = require("method-override");
var session = require("express-session");
var MongoStore = require('connect-mongo')({ session: session });
var static = require("serve-static");
var mongoose = require("mongoose");

/**
 * Controllers (route handlers).
 */

 var githubMiddleware = require('./controllers/githubMiddleware');
 var mongoController = require('./controllers/mongo');

/**
 * API keys and other secrets (shh..)
 */

var secret = require("./config/secret");

/**
 * Create Express server.
 */

var app = express();

/**
 * Connect to MongoDB.
 */

mongoose.connect(secret.db);
mongoose.connection.on('error', function() {
  console.error('MongoDB Connection Error. Make sure MongoDB is running.');
});

/**
 * Express configuration.
 */

app.set("port", process.env.PORT || 1337); // handles deployment
app.use(morgan("dev")); // logger in dev mode
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride());
app.use(cors()); // Does nothing!
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: secret.session,
  store: new MongoStore({
    url: secret.db,
    auto_reconnect: true
  })
}));
app.use(static(__dirname + "/public", "index.html")); // serve index, Angular takes over


/**
 * GitHub API routes. Gets data from github and saves it to mongo.
 */

// Refactors github requests into middleware. TODO: Error Handling
app.get("/api/github/org", githubMiddleware.getOrganization, githubMiddleware.sendResponse);
app.get("/api/github/members", githubMiddleware.getMembers, githubMiddleware.sendResponse);
app.get("/api/github/repos", githubMiddleware.getMemberRepos, githubMiddleware.sendResponse);
app.get("/api/github/stats", githubMiddleware.getRepoStats, githubMiddleware.sendResponse);
app.get("/api/github/all", githubMiddleware.getOrganization, githubMiddleware.getMembers, githubMiddleware.getMemberRepos, githubMiddleware.getRepoStats, githubMiddleware.sendResponse);

/**
 * Mongo routes. Gets stored repo statistics and converts it to d3 friendly format.
 * TODO: Figure out a way to persist req.org so we don't have to middleware through getOrg and slow down response time
 */

app.get("/api/stats/code_frequency", githubMiddleware.getOrganization, mongoController.getCodeFrequency);
app.get("/api/stats/punch_card", githubMiddleware.getOrganization, mongoController.getPunchCard);


/**
 * 404 Error Handler.
 */

app.get("*", function(req, res) {
  res.send(404);
});

/**
 * Start Express server.
 */

app.listen(app.get("port"), function() {
  console.log("Magic is happening on port %d", app.get("port"));
});

module.exports = app;
