var github = require("./githubScraperSteps");

/**
 * Pipe - Performs a collection of async tasks synchronously
 *
 * How to use pipe: 
 * Pipe invokes callbacks from left to right
 * The callbacks passed into pipe must accept the next() function as their last argument. 
 * When a callback is done and ready to move down the pipe, invoke next inside of the callback and pass in any arguments you want the subsequent function to work on.
 * To start, you must invoke the constructed pipe with any arguments expected in the first callback
 * 
 */

var pipe = function() {
  var slice = Array.prototype.slice;
  var fns = slice.call(arguments);
  var currentFn = 0; // Keeps track of which function we're on

  var next = function() {
    // Get next function in the fn list
    var fn = fns[++currentFn];

    // Invoke subsequent function with arguments passed into next
    console.log('calling function number', currentFn + 1, 'of', fns.length, 'in the pipe');
    fn.apply(null, slice.call(arguments).concat(next));
  };

  // Kick off first function in the pipe with whatever arguments we want to pass into it
  return function() {
    console.log('calling function number 1 of', fns.length, 'in the pipe');
    fns[0].apply(null, slice.call(arguments).concat(next));
  };
};

var getGitHubStats = pipe(github.getOrganization, github.getMembers, github.getMemberRepos, github.getRepoStats, github.allDone);
var testMe = pipe(github.getOrganization, github.getMembers, github.allDone);

getGitHubStats('hackreactor');
// testMe('hackreactor');

// If-ModifiedSince
// curl -i https://api.github.com/users/kayellpeee?access_token=2b46b34cef88b53a0d5165b09df76b5b54975400
// curl -i https://api.github.com/users/kayellpeee/repos?type=owner&sort=updated&per_page=100&access_token=2b46b34cef88b53a0d5165b09df76b5b54975400
// curl -i https://api.github.com/repos/kayellpeee/Vigenere-cipher?access_token=2b46b34cef88b53a0d5165b09df76b5b54975400 -H 'If-None-Match: "2e6bdd3a5da87a5b552fb916f2541100"'
// curl -i https://api.github.com/repos/kayellpeee/Vigenere-cipher?access_token=2b46b34cef88b53a0d5165b09df76b5b54975400 -H 'If-None-Match: "1b9fbf8a9b0f7631c6919df7d6b0398e"'
// curl -i https://api.github.com/repos/kayellpeee/Vigenere-cipher?access_token=2b46b34cef88b53a0d5165b09df76b5b54975400 -H 'If-None-Match: "037a7db93755bf9efafc0b3d77de339e"'
// curl -i https://api.github.com/repos/kayellpeee/Vigenere-cipher?access_token=2b46b34cef88b53a0d5165b09df76b5b54975400 -H 'If-Modified-Since: Mon, 17 Nov 2014 20:42:04 GMT'
