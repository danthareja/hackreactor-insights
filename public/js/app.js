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
        $http.get("/api/github/all")
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
 * controller: AppContoller - handles help dialog
 */

.controller("AppController", function($scope, $mdDialog){
  $scope.help = function(event) {
    console.log('help clicked');
    $mdDialog.show({
      templateUrl: 'partials/faq.html',
      targetEvent: event,
      controller: DialogController
    }).then(function() {
      console.log('You said "Okay".');
    }, function() {
      console.log('You cancelled the dialog.');
    });
  };
});

function DialogController($scope, $mdDialog) {
  $scope.hide = function() {
    $mdDialog.hide();
  };
  $scope.cancel = function() {
    $mdDialog.cancel();
  };
  $scope.answer = function(answer) {
    $mdDialog.hide(answer);
  };
}









