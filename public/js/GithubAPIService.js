angular.module("hrStats")

.service("GithubAPIService", ["$http", "$window", function($http, $window) {
  this.authenticate = function() {
    $window.location.href = "http://127.0.0.1:1337/auth/github"; // Super hacky
    // $http({
    //   // url: "//127.0.0.1:1337/auth/github",
    //   url: "/auth/github",
    //   method: "GET"
    // })
    // .success(function(data) {
    //   console.log("Authenticate successful!: ", data);
    // })
    // .error(function(data) {
    //   console.log("Error authentication", data);
    // });
  };

  this.get = function() {
    var url = "/api/github";
    $http.get(url)
      .success(function(data) {
        console.log("Here's yo github data from get: ", data);
      })
      .error(function(data) {
        console.log("Error getting github data", data);
      });
  };

  this.getMembers = function() {
    var url = "/api/github/members";
    $http.get(url)
      .success(function(data) {
        console.log("Here's yo github data from getMembers: ", data);
      })
      .error(function(data) {
        console.log("Error getting github data", data);
      });
  };

  this.getMemberRepos = function() {
    var url = "/api/github/members/repos";
    $http.get(url)
      .success(function(data) {
        console.log("Here's yo github data from getMemberRepos: ", data);
      })
      .error(function(data) {
        console.log("Error getting github data", data);
      });
  };
}]);