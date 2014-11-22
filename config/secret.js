/**
 * App secrets. Should be environmental variables when deployed
 */

module.exports = {
  githubToken: process.env.githubToken || "a2bd13be2479484d3a3469e98386daecfd0ea760",
  session: process.env.SESSION || "secretsecretsarenofununlesstheirsharedwitheveryone",
  db: process.env.MONGOHQ_URL || "mongodb://localhost/hrstats",
};