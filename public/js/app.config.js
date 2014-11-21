angular.module('hrStats')

.config(function($stateProvider, $urlRouterProvider) {
  $urlRouterProvider.otherwise("/");

  $stateProvider
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
});