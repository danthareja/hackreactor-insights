angular.module("hrStats")

.service("APIService", ["$http", function($http) {
  this.authenticate = function() {
    $http.get("/auth/github/")
      .success(function(data) {
        console.log("Authenticate successful!: ", data);
      })
      .error(function(data) {
        console.log("Error authentication", data);
      });
  };

  this.getData = function() {
    var url = "/api/github/";
    $http.get(url)
      .success(function(data) {
        console.log("Here's yo github data: ", data);
      })
      .error(function(data) {
        console.log("Error getting github data", data);
      });
  };
}]);