angular.module("hrStats", [])

.controller("MainController", function($scope, GithubAPIService) {
  $scope.authenticate = GithubAPIService.authenticate;
  $scope.test = GithubAPIService.test;
  $scope.getMembers = GithubAPIService.getMembers;
  $scope.getMemberRepos = GithubAPIService.getMemberRepos;
  $scope.getRepoStats = GithubAPIService.getRepoStats;
});