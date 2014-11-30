angular.module('PunchCard', ['APIService', 'd3', 'utils'])

.factory('PunchCardService', ['APIService', 'utils', function(APIService, utils){
  return APIService.getPunchCard().then(function(data) {
    var punchCard = {};

    // Put in proper format so we can use the same helper function
    var commitsPerDay = data.reduce(function(result, punchCard) {
      var dayNum = punchCard.day;
      var dayString = utils.numberToDay(dayNum);
      result[dayNum] = result[dayNum] || { day: dayString, commits: 0, repos: {} };
      result[dayNum].commits += punchCard.commits;

      punchCard.repos.reduce(function(repos, repo) {
        var key = repo.user + repo.repo;
        repos[key] = true;
        return repos;
      }, result[dayNum].repos);

      return result;
    },[]);

    var mostProductiveHour = utils.getMost('commits', data);
    var leastProductiveHour = utils.getLeast('commits', data);
    var mostProductiveDay = utils.getMost('commits', commitsPerDay);
    
    // Format insights
    punchCard.data = data;

    punchCard.mostProductiveHour = utils.numberToHour(mostProductiveHour.hour);
    punchCard.mostProductiveHourDay = utils.numberToDay(mostProductiveHour.day);
    punchCard.mostProductiveHourCommits = utils.numberWithCommas(mostProductiveHour.commits);
    punchCard.mostProductiveHourRepoCount = mostProductiveHour.repos.length;
    
    punchCard.leastProductiveHour = utils.numberToHour(leastProductiveHour.hour);
    punchCard.leastProductiveHourDay = utils.numberToDay(leastProductiveHour.day);
    punchCard.leastProductiveHourCommits = utils.numberWithCommas(leastProductiveHour.commits);
    punchCard.leastProductiveHourRepoCount = leastProductiveHour.repos.length;

    punchCard.mostProductiveDay = mostProductiveDay.day;
    punchCard.mostProductiveDayCommits = utils.numberWithCommas(mostProductiveDay.commits);
    punchCard.mostProductiveDayRepoCount = Object.keys(mostProductiveDay.repos).length;

    return punchCard;
  });
}])

.directive('punchCardGraph', ['d3', '$window', function(d3, $window){
  var link = function(scope, element, attrs) {
    // Main svg
    var svg = d3.select(element[0])
      .append('svg')
      .style('width', '100%');

    // Tooltip
    var tooltip = d3.select("#punchCard").insert("md-whiteframe")
      .attr("class", "md-whiteframe-z1")
      .style("opacity", 0)
      .style("text-align", "center")
      .style("width", "175px")
      .style("height", "70px")
      .style("padding", "5px");

    // Browser onresize event
    window.onresize = function() {
      scope.$apply();
    };

    // Watch for resize event
    scope.$watch(function(){
      return angular.element($window)[0].innerWidth * angular.element($window)[0].innerHeight;
    }, function(){
      scope.render(scope.data);
    });

    // Colors
    var white = '#DDDDDD';
    var blue = '#03a9f4';

    // Scale blue darkness based on number of commits
    var blueScale = d3.scale.linear()
                      .domain([0, d3.max(scope.data, function(d) {
                         return d.commits;
                       })])
                      .range([white, blue]);

    /**
     * Scope.render -> straight up d3
     */

    scope.render = function(data) {
      // Remove all previous items before render
      svg.selectAll('*').remove();

      // If we don't pass any data, return out of the element
      if (!data) return;

      // Size setup
      var width = element[0].parentElement.offsetWidth;
      var height = 400;
      var xPadding = 0;

      // yScale :: repo.commits -> rect height
      var yScale = d3.scale.linear()
                     .domain([0, d3.max(data, function(d) {
                        return d.commits;
                      })])
                     .range([0, height]);

      svg.attr('width', width).attr('height', height);
      svg.selectAll('rect')
        .data(data).enter()
        .append('rect')
        .attr('height', function(d,i) {
          return yScale(d.commits);
        })
        .attr('width', width/data.length - xPadding)
        .attr('x', function(d,i) {
          return i * (width/data.length);
        })
        .attr('y',function(d,i) {
          return height - yScale(d.commits);
        })
        .style('fill', function(d,i) {
          return blueScale(d.commits);
        })
        .style('opacity', 0.75)
        .on('mouseover', function(d) {
          console.log("mouseing over ", d);

          // Highlight bar
          d3.select(this).style("opacity", 1);

          // Add tooltip text
          tooltip.html(
            '<div><span>' + numberToDay(d.day) + ' @ ' + numberToHour(d.hour) + '</span></div>' +
            '<div><span>' + d.commits + ' commits to</span></div>' +
            '<div><span>' + d.repos.length + ' repos</span></div>'
          );

          // Fade in tooltip
          tooltip.transition()
            .duration(100)
            .style("opacity", 0.9);
        })
        .on('mouseout', function(d) {
          console.log("mouseing out of : ", d);

          // Remove highlight
          d3.select(this).style("opacity", 0.75);

          // Remove tooltip
          tooltip.transition()
            .duration(300)
            .style("opacity", 0);
        });

      // Helper methods
      function numberToDay(num){
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
      }

      function numberToHour(num) {
        if (num === 0) return '12am';
        if (num === 12) return '12pm';
        return num > 12 ? num - 12 + "pm" : num + "am";
      }
    };
  };

  return {
    restrict: 'E',
    scope: {
      data: '='
    },
    link: link
  };
}]);