angular.module("hrStats", ["ui.router", "d3", "ngMaterial"])

/**
 * ===== Client side breakdown =====
 * There are a few steps to get all the data we need onto our client-side. Hold on tight, it's a wacky process
 * We need to provide a login interface. Normally this could be a straight-forward $http.get request, but CORS was giving some issues so
 * login is done on it's own page, and is an href straight to the server-side route (/auth/github)
 * After login, the server redirects to a loading page. The only thing this loading page does is call another api route (/api/github/all)
 * that takes 30-90 seconds to make the ~thousand calls to github and store all this data to mongo (Why did I even think mongo was a good idea?)
 * This is a different state to provide a place to put a user-friendly loading animation. After this server call is done, our success callback is 
 * triggered in our loading controller, sending us to the home state and passing in the profile data we got from our github calls.
 * On the home page, we have all of our information tossed in mongo, but not in a d3 friendly manner. So we resolve two more api routes
 * (/api/stats/code_frequency) & (/api/stats/punch_card) that format our data nicely for us, and inject them into our controller so d3 can use them
 * From there, our HomeController has all the data we need, formatted nicely in the objects codeFrequency and punchCard from our resolve, and uses
 * d3 to visualize everything. Was this the most effiecient? Hell no. Was is a fun lesson in resolves and ui-router? You bet.
 */


/**
 * ui.router config
 */

.config(function($stateProvider, $urlRouterProvider) {
  $urlRouterProvider.otherwise("/login");

  $stateProvider
    // Login :: auth -> loading
    .state("login", {
      url: "/login",
      templateUrl: "partials/login.html",
    })
    // Loading (animation page) :: github -> home
    .state("loading", {
      url: "/loading",
      templateUrl: "partials/loading.html",
      controller: function($state, $http) {
        $http.get("/api/github/all") //CHANGETHIS back to all!!
          .then(function(profile) {
            $state.go("home", profile.data); //TODO: Get this working, it's not passing right 
          });
        }
    })
    // Home :: resolve stats -> visual
    // TODO: Something something, default here if logged in
    .state("home", {
      url: "/",
      templateUrl: "partials/home.html",
      resolve: {
        codeFrequency: function($http) {
          return $http.get("/api/stats/code_frequency")
            .then(function(data) { return data.data; });
        },
        punchCard: function($http) {
          return $http.get("/api/stats/punch_card")
            .then(function(data) { return data.data; });
        }
      },
      controller: "HomeController"
    });
})

/**
 * controller: HomeController
 */

.controller("HomeController", function($scope, $stateParams, punchCard, codeFrequency) {
  console.log("-------- data inside home controller --------");
  console.log("state params: ", $stateParams);
  console.log("punch: ", punchCard);
  console.log("codeFrequency: ", codeFrequency);
  console.log("-------- END data inside home controller --------");
  
  // Helper methods
  var getTotal = function(stat, type) {
    return type.reduce(function(total, repo){
      return repo[stat] + total;
    },0);
  };

  var getMost = function(stat, type) {
    return type.reduce(function(current, repo){
      return current[stat] > repo[stat] ? current : repo;
    },0);
  };

  var getLeast = function(stat, type) {
    return type.reduce(function(current, repo){
      return current[stat] < repo[stat] ? current : repo;
    },0);
  };

  $scope.numberToDay = function(num){
    var days = {
      0 : 'Sunday',
      1 : 'Monday',
      2 : 'Tuesday',
      3 : 'Wednesday',
      4 : 'Thursday',
      5 : 'Friday',
      6 : 'Saturday'
    };
    return days[num];
  };

  $scope.numberToHour = function(num) {
    if (num === 0) return '12am';
    if (num === 12) return '12pm';
    return num > 12 ? num - 12 + "pm" : num + "am";
  };

  // For d3
  $scope.codeFrequency = codeFrequency;
  $scope.punchCard = punchCard;

  // Insights
  $scope.totalAdditions = getTotal('additions', codeFrequency);
  $scope.totalDeletions = getTotal('deletions', codeFrequency);
  $scope.mostAdditions = getMost('additions', codeFrequency);
  $scope.mostDeletions = getMost('deletions', codeFrequency);
  $scope.mostNetLines = getMost('net', codeFrequency);

  // Put in proper format so we can use the same helper function
  var commitsPerDay = punchCard.reduce(function(result, punchCard) {
    var dayNum = punchCard.day;
    var dayString = $scope.numberToDay(dayNum);
    result[dayNum] = result[dayNum] || { day: dayString, commits: 0, repos: {} };
    result[dayNum].commits += punchCard.commits;

    // Add only unique repos to the list
    punchCard.repos.reduce(function(repos, repo) {
      var key = repo.user + repo.repo;
      repos[key] = true;
      return repos;
    }, result[dayNum].repos);

    return result;
  },[]);
  commitsPerDay.forEach(function(day) {
    day.repoCount = Object.keys(day.repos).length;
  });

  $scope.mostProductiveDay = getMost('commits', commitsPerDay);
  $scope.leastProductiveDay = getLeast('commits', commitsPerDay);

  $scope.mostProductiveHour = getMost('commits', punchCard);
  $scope.leastProductiveHour = getLeast('commits', punchCard);
});

