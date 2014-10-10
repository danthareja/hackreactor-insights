var _ = require("lodash");
var passport = require("passport");
var GitHubStrategy = require("passport-github").Strategy;
var User = require('../models/User');
var secret = require("./secret");

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing. 

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GitHubStrategy(secret.github, function(accessToken, refreshToken, profile, done) {
  console.log("accessToken in passport strat", accessToken);
  User.findOne({ github: profile.id }, function(err, existingUser) {
    if (existingUser) return done(null, existingUser);
    User.findOne({ email: profile._json.email }, function(err, existingEmailUser) {
      if (existingEmailUser) {
        console.log('errors', { msg: 'There is already an account using this email address. Sign in to that account and link it with GitHub manually from Account Settings.' });
        done(err);
      } else {
        var user = new User();
        user.email = profile._json.email;
        user.github = profile.id;
        user.tokens.push({ kind: 'github', accessToken: accessToken });
        user.profile.name = profile.displayName;
        user.profile.picture = profile._json.avatar_url;
        user.profile.location = profile._json.location;
        user.profile.website = profile._json.blog;
        user.save(function(err) {
          console.log("saving new user", user);
          done(err, user);
        });
      }
    });
  });
}));

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.

exports.isAuthenticated = function(req, res, next) {
  var provider = req.path.split('/').slice(-1)[0];

  if (req.isAuthenticated()) { return next(); }
  console.log("Not authenticated, redirecting to ", '/auth/' + provider )
  res.redirect('/auth/' + provider);
};

exports.isAuthorized = function(req, res, next) {
  var provider = req.path.split('/').slice(-1)[0];

  if (_.find(req.user.tokens, { kind: provider })) {
    next();
  } else {
    console.log("Not authenticated, redirecting to ", '/auth/' + provider )
    res.redirect('/auth/' + provider);
  }
};