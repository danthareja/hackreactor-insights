/**
 * App secrets. Should be environmental variables when deployed
 */

module.exports = {
  githubToken: process.env.githubToken || "2b46b34cef88b53a0d5165b09df76b5b54975400",
  session: process.env.SESSION || "secretsecretsarenofununlesstheirsharedwitheveryone",
  db: process.env.MONGOHQ_URL || "mongodb://localhost/hrstats",
};