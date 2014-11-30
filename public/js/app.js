angular.module('hrInsights', ['ui.router', 'hrInsights.stats'])

.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
  $urlRouterProvider.otherwise('/');
  $stateProvider
    .state('insights', {
      url: '/',
      templateUrl: 'partials/insights.html',
      resolve: {
        codeFrequency: function(CodeFrequencyService) { return CodeFrequencyService; },
        punchCard: function(PunchCardService) { return PunchCardService; }
      },
      controller: 'AppController'
    });
}])

.controller('AppController', ['$scope', '$interval', 'punchCard', 'codeFrequency', function($scope, $interval, punchCard, codeFrequency) {
  $scope.punchCard = punchCard;
  $scope.codeFrequency = codeFrequency;

  // Cycle through insights
  var nextInsight = function() {
    $scope.insight = $scope.insight === 4 ? 0 : $scope.insight + 1;
  };
  $scope.insight = 0;
  $interval(nextInsight, 5000);
}]);









