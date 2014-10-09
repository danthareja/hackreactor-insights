var passport = require("passport");
var GitHubStrategy = require("passport-github").Strategy;
var secret = require("./secret");

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete GitHub profile is serialized
//   and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new GitHubStrategy({
    clientID: secret.GITHUB_CLIENT_ID,
    clientSecret: secret.GITHUB_CLIENT_SECRET,
    callbackURL: "http://127.0.0.1:1337/auth/github/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    // To keep the example simple, the user's GitHub profile is returned to
    // represent the logged-in user.  In a typical application, you would want
    // to associate the GitHub account with a user record in your database,
    // and return that user instead.
    return done(null, profile);
  }
));
