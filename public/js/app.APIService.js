angular.module('hrStats')

.service('APIService', ['$http', '$q', function($http, $q) {

  this.getCodeFrequency = function() {
    return $http.get("/api/stats/code_frequency").then(function(data) {
      return data.data;
    });
  };

  this.getPunchCard = function() {
    return $http.get("/api/stats/punch_card").then(function(data) {
      return data.data;
    });
  };

  this.getAllStats = function() {
    return $q.all({
      codeFrequency: this.getCodeFrequency(),
      punchCard: this.getPunchCard()
    });
  };

}]);