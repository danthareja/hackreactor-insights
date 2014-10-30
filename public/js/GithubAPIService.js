angular.module("hrStats")

.service("GithubAPIService", ["$http", "$window", function($http, $window) {
  // TODO: figure out this CORS!
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

  this.test = get("/api/github");
  this.getMembers = get("/api/github/members");
  this.getMemberRepos = get("/api/github/members/repos");
  this.getRepoStats = get("/api/github/members/repos/stats");

  function get(url) {
    return function() {
      $http.get(url)
      .success(function(data) {
        console.log("Here's yo github data from" + url, data);
      })
      .error(function(data) {
        console.log("Error getting github data from" + url, data);
      });
    };
  }
}]);