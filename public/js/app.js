angular.module("hrStats", ["d3"])

.controller("MainController", function($scope, GithubAPIService) {
  $scope.authenticate = GithubAPIService.authenticate;
  $scope.test = GithubAPIService.test;
  $scope.stats = GithubAPIService.stats;
  $scope.getRepoStats = GithubAPIService.getRepoStats;
  $scope.getPunchCard = GithubAPIService.getPunchCard;
  $scope.getCodeFrequency = GithubAPIService.getCodeFrequency;
});