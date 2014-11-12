/**
 * directive: codeFrequency - handles all the pretty d3 visualization for the codeFrequency dataset
 */

angular.module('hrStats')
.directive('codeFrequency', ['d3', '$window', function(d3, $window){
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
    var white = '#EEEEEE';
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
      var height = 75;
      
      var totalAdditions = scope.data.reduce(function(total, repo){
        return repo.additions + total;
      }, 0);

      // Scale :: repo.additions -> svg width
      var scale = d3.scale.linear()
                             .domain([0, totalAdditions])
                             .range([0, width]);

      var additionsSoFar = 0; // keeps track of where to put additions data

      svg.attr('width', width).attr('height', height);
      svg.selectAll('rect')
        .data(data).enter()
        .append('rect')
        .attr('height', height)
        .attr('width', function(d,i) {
          return additionScale(d.additions);
        })
        .attr('x', function(d,i) {
          additionsSoFar += d.additions;
          return additionScale(additionsSoFar - d.additions);
        })
        .style('fill', function(d,i) {
          return i % 2 === 0 ? white : blue;
        })
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