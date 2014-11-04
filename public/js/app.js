angular.module("hrStats", ["ui.router", "d3"])
.config(function($stateProvider, $urlRouterProvider) {
  $urlRouterProvider.otherwise("/login");

  // TODO: Comment this process. this is some wacky shit..
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
        $http.get("/api/github/stats")
          .then(function(profile) {
            $state.go("home", profile.data);
          });
        }
    })
    // Home :: resolve stats -> visual
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

// All the d3
.controller("HomeController", function($scope, $stateParams, punchCard, codeFrequency) {
  console.log("state params: ", $stateParams);
  console.log("punch: ", punchCard);
  console.log("codeFrequency: ", codeFrequency);
});
