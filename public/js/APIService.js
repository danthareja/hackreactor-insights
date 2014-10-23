angular.module("hrStats")

.service("APIService", ["$http", "$window", function($http, $window) {
  this.authenticate = function() {
    $window.location.href = "http://127.0.0.1:1337/auth/github"; // Super hacky
    // $http({
    //   url: "//127.0.0.1:1337/auth/github",
    //   method: "GET"
    // })
    // .success(function(data) {
    //   console.log("Authenticate successful!: ", data);
    // })
    // .error(function(data) {
    //   console.log("Error authentication", data);
    // });
  };

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