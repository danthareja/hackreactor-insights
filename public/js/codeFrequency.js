/**
 * directive: codeFrequency - handles all the pretty d3 visualization for the codeFrequency dataset
 */

angular.module('hrStats')
.directive('codeFrequency', ['d3', '$window', function(d3, $window){
  var link = function(scope, element, attrs) {
    // Main svg
    var svg = d3.select(element[0])
      .append('svg')
      .style('width', '100%');

    // Tooltip
    var tooltip = d3.select("#codeFrequency").insert("md-whiteframe")
      .attr("class", "md-whiteframe-z1")
      .style("opacity", 0)
      .style("text-align", "center")
      .style("width", "275px")
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
      var height = 75;
      
      var totalAdditions = scope.data.reduce(function(total, repo){
        return repo.additions + total;
      }, 0);

      // xScale :: repo.additions -> svg width
      var xScale = d3.scale.linear()
                            .domain([0, totalAdditions])
                            .range([0, width]);

      var additionsSoFar = 0; // keeps track of where to put each rectangle

      svg.attr('width', width).attr('height', height);
      svg.selectAll('rect')
        .data(data).enter()
        .append('rect')
        .attr('height', height)
        .attr('width', function(d,i) {
          return xScale(d.additions);
        })
        .attr('x', function(d,i) {
          additionsSoFar += d.additions;
          return xScale(additionsSoFar - d.additions);
        })
        .style('fill', function(d,i) {
          return i % 2 === 0 ? white : blue;
        })
        .style('opacity', 0.75)
        .on('mouseover', function(d) {
          console.log("mouseing over ", d);
          // Highlight bar
          d3.select(this).style("opacity", 1);

          // Add tooltip text
          tooltip.html(
            '<div><span>' + d.username + '/' + d.repo + '\n</span></div>' +
            '<div><span class="green">+' + d.additions + '</span>/<span class="red"> -' + d.deletions + '</span></div>'
          );

          // Fade in tooltip
          tooltip.transition()
            .duration(200)
            .style("opacity", 0.9);
        })
        .on('mouseout', function() {
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