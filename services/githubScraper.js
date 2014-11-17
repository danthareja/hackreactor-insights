var github = require("./githubScraperSteps");

var pipe = function() {
  var slice = Array.prototype.slice;
  var fns = slice.call(arguments);
  var currentFn = 0; // Keeps track of wat functoin we're on

  var next = function() {
    // Get next function in the fn list
    var fn = fns[++currentFn];

    // Invoke next function with arguments passed into next
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
var testMe = pipe(github.getOrganization, github.allDone);
testMe('hackreactor');