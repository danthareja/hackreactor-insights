angular.module("hrStats", [])

.controller("MainController", function($scope, GithubAPIService) {
  $scope.authenticate = GithubAPIService.authenticate;
  $scope.test = GithubAPIService.test;
  $scope.getRepoStats = GithubAPIService.getRepoStats;
  $scope.getPunchCard = GithubAPIService.getPunchCard;
  $scope.getCodeFrequency = GithubAPIService.getCodeFrequency;
});