/**
 * controller: HomeController - handles all visualization and insights on homepage
 */

angular.module("hrStats").controller("HomeController", function($scope, $stateParams, $interval, punchCard, codeFrequency) {
  console.log("-------- data inside home controller --------");
  console.log("state params: ", $stateParams);
  console.log("punch: ", punchCard);
  console.log("codeFrequency: ", codeFrequency);
  console.log("-------- END data inside home controller --------");
  
  // Helper methods
  var getTotal = function(stat, type) {
    return type.reduce(function(total, repo){
      return repo[stat] + total;
    },0);
  };

  var getMost = function(stat, type) {
    return type.reduce(function(current, repo){
      return current[stat] > repo[stat] ? current : repo;
    },0);
  };

  var getLeast = function(stat, type) {
    return type.reduce(function(current, repo){
      return current[stat] < repo[stat] ? current : repo;
    },0);
  };

  $scope.numberToDay = function(num){
    var days = {
      0 : 'Sunday',
      1 : 'Monday',
      2 : 'Tuesday',
      3 : 'Wednesday',
      4 : 'Thursday',
      5 : 'Friday',
      6 : 'Saturday'
    };
    return days[num];
  };

  $scope.numberToHour = function(num) {
    if (num === 0) return '12am';
    if (num === 12) return '12pm';
    return num > 12 ? num - 12 + "pm" : num + "am";
  };

  // For d3
  $scope.codeFrequency = codeFrequency;
  $scope.punchCard = punchCard;

  // Insights
  $scope.totalAdditions = getTotal('additions', codeFrequency);
  $scope.totalDeletions = getTotal('deletions', codeFrequency);
  $scope.mostAdditions = getMost('additions', codeFrequency);
  $scope.mostDeletions = getMost('deletions', codeFrequency);
  $scope.mostNetLines = getMost('net', codeFrequency);

  // Put in proper format so we can use the same helper function
  var commitsPerDay = punchCard.reduce(function(result, punchCard) {
    var dayNum = punchCard.day;
    var dayString = $scope.numberToDay(dayNum);
    result[dayNum] = result[dayNum] || { day: dayString, commits: 0, repos: {} };
    result[dayNum].commits += punchCard.commits;

    // Add only unique repos to the list
    punchCard.repos.reduce(function(repos, repo) {
      var key = repo.user + repo.repo;
      repos[key] = true;
      return repos;
    }, result[dayNum].repos);

    return result;
  },[]);
  commitsPerDay.forEach(function(day) {
    day.repoCount = Object.keys(day.repos).length;
  });

  $scope.mostProductiveDay = getMost('commits', commitsPerDay);
  $scope.leastProductiveDay = getLeast('commits', commitsPerDay);

  $scope.mostProductiveHour = getMost('commits', punchCard);
  $scope.leastProductiveHour = getLeast('commits', punchCard);

  // Cycle through insights
  var nextInsight = function() {
    $scope.insight = $scope.insight === 4 ? 0 : $scope.insight + 1;
  };
  $scope.insight = 0;
  $interval(nextInsight, 5000);

});

