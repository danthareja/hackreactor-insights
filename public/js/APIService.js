angular.module("hrStats")

.service("APIService", ["$http", function($http) {
  this.getData = function() {
    var url = "/api/github";

    $http.get(url)
      .success(function(data) {
        console.log("Here's yo github data: ", data);
      })
      .error(function(data) {
        console.log("Error getting github data", data);
      });
  };
}]);