/**
 * App secrets. Make sure this file is in .gitignore
 */

module.exports = {
  github: {
    clientID: process.env.githubID || "b19c48c5c9c509973d5c",
    clientSecret: process.env.githubSecret || "b0b8d7086f30c51a5ff2a394414c989e8b565f33",
    callbackURL: process.env.githubCallback || "http://127.0.0.1:1337/auth/github/callback",
    token: "2b46b34cef88b53a0d5165b09df76b5b54975400"
  },
  session: process.env.SESSION || "secretsecretsarenofununlesstheirsharedwitheveryone",
  db: process.env.MONGOHQ_URL || "mongodb://localhost/hrstats"
};