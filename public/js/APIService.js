angular.module('hrInsights.APIService', [])
// TODO: figure out timing on localStorage reup
.service('APIService', ['$http', '$q', function($http, $q) {
  this.getCodeFrequency = function() {
    console.log('getting codeFrequency...');
    var q = $q.defer();
    var codeFrequency = localStorage.getItem('hr.codeFrequency');

    if (codeFrequency) {
      console.log('got codeFrequency, it was in localStorage');
      q.resolve(JSON.parse(codeFrequency));
    } else {
      $http.get("/api/stats/code_frequency").then(function(data) {
        localStorage.setItem('hr.codeFrequency', JSON.stringify(data.data));
        console.log('got codeFrequency, from the api');
        q.resolve(data.data);
      });
    }

    return q.promise;
  };

  this.getPunchCard = function() {
    console.log('getting punchCard...');
    var q = $q.defer();
    var punchCard = localStorage.getItem('hr.punchCard');

    if (punchCard) {
      console.log('got punchCard, it was in localStorage');
      q.resolve(JSON.parse(punchCard));
    } else {
      $http.get("/api/stats/punch_card").then(function(data) {
        localStorage.setItem('hr.punchCard', JSON.stringify(data.data));
        console.log('got punchCard, from the api');
        q.resolve(data.data);
      });
    }

    return q.promise;
  };

  this.getAllStats = function() {
    return $q.all({
      codeFrequency: this.getCodeFrequency(),
      punchCard: this.getPunchCard()
    });
  };
}]);