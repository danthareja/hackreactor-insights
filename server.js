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
var passport = require("passport");
var mongoose = require("mongoose");

/**
 * Controllers (route handlers).
 */

 var github = require('./controllers/github');

/**
 * API keys and Passport configuration.
 */

var secret = require("./config/secret");
var passportConf = require("./config/passportConf");

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
app.use(passport.initialize());
app.use(passport.session());
app.use(static(__dirname + "/public", "index.html")); // serve index, Angular takes over

/**
 * OAuth sign-in routes.
 */

app.get("/auth/github", passport.authenticate("github"));
app.get("/auth/github/callback", passport.authenticate("github"), function(req, res) {
  // Successful authentication, redirect back to Angular
  console.log("Successful github authentication!");
  res.redirect("/");
});

/**
 * GitHub API routes.
 */

app.get("/api/github", passportConf.isAuthenticated, passportConf.isAuthorized, github.get);
app.get("/api/github/members", passportConf.isAuthenticated, passportConf.isAuthorized, github.getMembers);
app.get("/api/github/members/repos", passportConf.isAuthenticated, passportConf.isAuthorized, github.getMemberRepos);
// app.get("/api/github/members/repos/stats", passportConf.isAuthenticated, passportConf.isAuthorized, github.getMemberRepos);


/**
 * 404 Error Handler.
 */

app.get("*", function(req, res) {
  res.status(404).sendFile(__dirname + "/404.html");
});

/**
 * Start Express server.
 */

app.listen(app.get("port"), function() {
  console.log("Magic is happening on port %d", app.get("port"));
});

module.exports = app;
