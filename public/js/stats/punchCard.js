angular.module('hrInsights.stats.punchCard', ['hrInsights.APIService', 'hrInsights.utils', 'd3'])

.factory('PunchCardService', ['APIService', 'utils', function(APIService, utils) {
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

.directive('punchCardGraph', ['$window', 'd3', 'utils', function($window, d3, utils) {
  var link = function(scope, element, attrs) {
    
    // Main svg
    var svg = d3.select(element[0]).append('svg');

    // Tooltip
    var tooltip = d3.select('.tooltip').append('div')
      .style('width', '0px');

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


    // Scale blue darkness based on number of commits
    var maxCommitCount = utils.getMost('commits', scope.data).commits;
    var blueScale = d3.scale.linear()
      .domain([0, maxCommitCount])
      .range(['#FFFFFF', '#0298F5']);

    /**
     * Scope.render -> straight up d3
     */

    scope.render = function(data) {
      // Remove all previous items before render
      svg.selectAll('*').remove();

      // Size setup
      var width = element[0].parentElement.offsetWidth;
      var height = 400;

      // Responsive height
      if (width < 800 && width >= 550) {
        height = 300;
      } else if (width < 550) {
        height = 200;
      }

      var yPadding = 20;
      var xPadding = 40;

      // Graph scales
      var yScale = d3.scale.linear()
        .domain([0, maxCommitCount])
        .range([yPadding, height - yPadding]);

      var xScale = d3.scale.linear()
        .domain([0, width])
        .range([xPadding, width]);

      // Axis
      var yAxisScale = d3.scale.linear()
        .domain([0, maxCommitCount])
        .range([height - yPadding, yPadding]);

      var lastSunday = utils.getLastSunday(new Date());
      var lastLastSunday = utils.getLastSunday(lastSunday);

      var xAxisScale = d3.time.scale()
        .domain([lastLastSunday, lastSunday])
        .range([xPadding, width]);

      var xAxis = d3.svg.axis()
        .scale(xAxisScale)
        .orient('bottom')
        .ticks(14)
        .tickFormat(d3.time.format('%a %I%p'));

      var yAxis = d3.svg.axis()
        .scale(yAxisScale)
        .orient('left');

      // Responsive stuff
      if (width < 800) {
        data = data.filter(function(d, i) {
          return i % 2 || d.commits == maxCommitCount;
        });
        xAxis.ticks(7);
      }

      if (width < 550) {
        data = data.filter(function(d, i) {
          return i % 3 || d.commits == maxCommitCount;
        });
        xAxis.tickFormat(d3.time.format('%a'));
      }

      // Add bars to graph
      svg.attr('width', width).attr('height', height);
      svg.selectAll('rect')
        .data(data).enter()
        .append('rect')
        .attr('height', function(d,i) {
          return yScale(d.commits) - yPadding;
        })
        .attr('width', width/data.length)
        .attr('x', function(d,i) {
          return xScale(i * (width/data.length));
        })
        .attr('y',function(d,i) {
          return height - yScale(d.commits);
        })
        .style('fill', function(d,i) {
          return blueScale(d.commits);
        })
        .style('opacity', 0.75)

      // Animations
      .on('mouseover', function(d) {
        // Highlight bar
        d3.select(this)
        .style('opacity', 0.75)
        .style('fill', '#65D868');

        // Add tooltip text
        tooltip.html(
          '<span class="italic">' + utils.numberToDay(d.day) + '</span>' + ' @ ' + '<span class="italic">' + utils.numberToHour(d.hour) + '</span>' + '<br>' +
          '<span style="font-weight:400">' + d.commits + '</span>' + ' commits to ' + '<br>' +
          '<span style="font-weight:400">' + d.repos.length + '</span>' + ' repos'
        );

        // Fade in tooltip
        tooltip.style('margin', '10px');
        tooltip.transition()
          .duration(500)
          .ease('cubic-out')
          .style('width', '135px')
          .style('opacity', 1);
      })
      .on('mouseout', function(d) {
        // Remove highlight
        d3.select(this)
        .style('opacity', 0.75)
        .style('fill', function(d,i) {
          return blueScale(d.commits);
        });

        // Remove tooltip
        tooltip.transition()
          .delay(500)
          .duration(500)
          .ease('cubic-out')
          .style('width', '0px')
          .style('opacity', 0)
          .style('margin', '0px');
      });

      // Add axis
      svg.append('g')
        .attr('class', 'axis')
        .attr('transform', 'translate(0,' + (height - yPadding) + ')')
        .call(xAxis);

      svg.append('g')
        .attr('class', 'axis')
        .attr('transform', 'translate(' + xPadding + ',0)')
        .call(yAxis);
    };
  };

  return {
    restrict: 'EA',
    scope: {
      data: '='
    },
    link: link
  };
}]);