var express = require("express");
var morgan = require("morgan");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var methodOverride = require("method-override");
var session = require("express-session");
var static = require("serve-static");
var passport = require("passport");
var secret = require("./secret");
var github = require("./github");

// Handles deployment
var PORT = process.env.PORT || 1337;

// Create our server
var app = express();

// Configure Express
app.use(morgan("dev")); // logger
app.use(cookieParser());
app.use(bodyParser());
app.use(methodOverride());
app.use(session({ secret: secret.EXPRESS_SESSION }));
app.use(passport.initialize());
app.use(passport.session());
app.use(static(__dirname, "index.html")); // serve index, Angular takes over

// Github passport routes
app.get("/auth/github", passport.authenticate("github"));
app.get("/auth/github/callback", passport.authenticate("github", { failureRedirect: "/login" }), function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/");
  });

// 404 Every other route
app.get("*", function(req, res) {
  res.send(404);
});

// Start dat server
var server = app.listen(PORT, function() {
  console.log("We're making it happen on port %d", server.address().port);
});

// Export dat server
module.exports = app;