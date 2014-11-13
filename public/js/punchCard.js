/**
 * directive: codeFrequency - handles all the pretty d3 visualization for the codeFrequency dataset
 */

angular.module('hrStats')
.directive('punchCard', ['d3', '$window', function(d3, $window){
  var link = function(scope, element, attrs) {
    // Main svg
    var svg = d3.select(element[0])
      .append('svg')
      .style('width', '100%');

    // Tooltip
    var tooltip = d3.select("#punchCard").insert("md-whiteframe")
      .attr("class", "md-whiteframe-z1 tooltip")
      .style("opacity", 0)
      .style("text-align", "center")
      .style("width", "150px")
      .style("height", "50px")
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

      // xScale :: repo.additions -> svg width
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
            '<div><span class="tooltipTitle">' + d.commits + ' commits</span></div>' +
            '<div><span>over ' + d.repos.length + ' repos</span></div>'
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