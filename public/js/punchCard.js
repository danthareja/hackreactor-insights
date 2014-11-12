/**
 * directive: codeFrequency - handles all the pretty d3 visualization for the codeFrequency dataset
 */

angular.module('hrStats')
.directive('punchCard', ['d3', '$window', function(d3, $window){
  var link = function(scope, element, attrs) {
    var svg = d3.select(element[0])
      .append('svg')
      .style('width', '100%');

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
    var blue = '#2874DC';

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
      var xPadding = 1;

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
        .style('fill', blue)
        .on('mouseover', function() {
          var currentRepo = d3.select(this);
          console.log("mouseing over ", this);
        })
        .on('mouseout', function() {
          var currentRepo = d3.select(this);
          console.log("mouseing out of : ", this);
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