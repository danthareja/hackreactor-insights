var passport = require("passport");
var GitHubStrategy = require("passport-github").Strategy;
var User = require('../models/User');
var secret = require("./secret");

/**
 * Passport session setup.
 *   To support persistent login sessions, Passport needs to be able to
 *   serialize users into and deserialize users out of the session.  Typically,
 *   this will be as simple as storing the user ID when serializing, and finding
 *   the user by ID when deserializing. 
 */

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

/**
 * Use the GitHubStrategy within Passport.
 *   Strategies in Passport require a `verify` function, which accept
 *   credentials (in this case, an accessToken, refreshToken, and GitHub
 *   profile), and invoke a callback with a user object.
*/

passport.use(new GitHubStrategy(secret.github, function(accessToken, refreshToken, profile, done) {
  console.log("accessToken in passport strat", accessToken);
  User.findOne({ githubId: profile.id }, function(err, existingUser) {
    if (existingUser) return done(null, existingUser);
    else {
      var user = new User();
      user.email = profile._json.email;
      user.githubId = profile.id;
      user.token = accessToken;
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
}));

/**
 * Simple route middleware to ensure user is authenticated.
 *   Use this route middleware on any resource that needs to be protected.  If
 *   the request is authenticated (typically via a persistent login session),
 *   the request will proceed.  Otherwise, the user will be redirected to the login page.
 */

exports.isAuthenticated = function(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  console.log("Not authenticated, redirecting to ", '/auth/github');
  res.redirect('/auth/github');
};

exports.isAuthorized = function(req, res, next) {
  if (req.user.token) {
    next();
  } else {
    console.log("Not authorized, redirecting to ", '/auth/github');
    res.redirect('/auth/github');
  }
};