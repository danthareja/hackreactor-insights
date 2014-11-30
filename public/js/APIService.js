angular.module('hrInsights.APIService', ['LocalStorageModule'])
// TODO: figure out timing on localStorage reup
.service('APIService', ['$http', '$q', 'localStorageService', function($http, $q, localStorageService) {
  this.getCodeFrequency = function() {
    var q = $q.defer();
    var codeFrequency = localStorageService.get('codeFrequency');

    if (codeFrequency) {
      q.resolve(codeFrequency);
    } else {
      $http.get("/api/stats/code_frequency").then(function(data) {
        localStorageService.set('codeFrequency', data.data);
        q.resolve(data.data);
      });
    }

    return q.promise;
  };

  this.getPunchCard = function() {
    var q = $q.defer();
    var punchCard = localStorageService.get('punchCard');

    if (punchCard) {
      q.resolve(punchCard);
    } else {
      $http.get("/api/stats/punch_card").then(function(data) {
        localStorageService.set('punchCard', data.data);
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