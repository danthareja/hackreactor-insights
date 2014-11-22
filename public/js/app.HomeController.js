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

  $scope.numberWithCommas = function(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  $scope.additionsMap = function(num) {
    var map = {
      0: "",
      10000: "a simple iPhone game",
      40000: "a photo editing iPhone app",
      80000: "a pacemaker",
      120000: "Photoshop v1 (1990)",
      200000: "Camino (an entire web browser)",
      310000: "the Quake 3 game engine",
      400000: "a Space Shuttle",
      1000000: "War And Peace x 14, Ulysses x 25, The Catcher in The Rye x 63",
      1000000: "Crysis",
      1200000: "Age of Empires Online",
      1700000: "F-22 Raptor",
      2000000: "the Hubble Space Telescope"
    };

    // Get number of line in map closest to input num
    var lines = Object.keys(map).reduce(function(closest, current){
      return num > current ? current : closest;
    }, 0);

    return map[lines];
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
  $scope.averageAdditions = Math.floor($scope.totalAdditions / 152); // Hardedcoded for now. Sorry future Dan.

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
  $interval(nextInsight, 4000);
});

