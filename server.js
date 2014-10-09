// Module dependencies
var express = require("express");
var morgan = require("morgan");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var methodOverride = require("method-override");
var session = require("express-session");
var static = require("serve-static");
var passport = require("passport");
var secret = require("./secret");
var github = require("./github"); // GitHub passport strategy

// Create app
var app = express();

// Configure Express
app.set("port", process.env.PORT || 1337); // handles deployment
app.use(morgan("dev")); // logger in dev mode
app.use(cookieParser());
app.use(bodyParser());
app.use(methodOverride());
app.use(session({ secret: secret.EXPRESS_SESSION }));
app.use(passport.initialize());
app.use(passport.session());
app.use(static(__dirname + "/public", "index.html")); // serve index, Angular takes over

// Github routes
app.get("/auth/github", passport.authenticate("github"));
app.get("/auth/github/callback", passport.authenticate("github"), function(req, res) {
    // Successful authentication, redirect back to Angular
    res.redirect("/");
  });

// 404 Every other route
app.get("*", function(req, res) {
  res.status(404).sendFile(__dirname + "/404.html");
});

// Start server
app.listen(app.get("port"), function() {
  console.log("We're making it happen on port %d", app.get("port"));
});
