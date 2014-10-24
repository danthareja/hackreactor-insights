angular.module("hrStats", [])

.controller("MainController", function($scope, GithubAPIService) {
  $scope.authenticate = GithubAPIService.authenticate;
  $scope.get = GithubAPIService.get;
  $scope.getMembers = GithubAPIService.getMembers;
  $scope.getMemberRepos = GithubAPIService.getMemberRepos;
});