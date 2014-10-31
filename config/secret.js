/**
 * App secrets. Make sure this file is in .gitignore
 */

module.exports = {
  github: {
    clientID: process.env.githubID || "fd3e3a16322113f365ab",
    clientSecret: process.env.githubSecret ||"61d2671c78ca9e6f53056f9181ee7b071bc8553e",
  },
  session: process.env.SESSION || "secretsecretsarenofununlesstheirsharedwitheveryone",
  db: process.env.MONGOHQ_URL || "mongodb://localhost/hrstats"
};