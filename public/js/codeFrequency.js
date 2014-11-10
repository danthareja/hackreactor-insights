/**
 * directive: codeFrequency - handles all the pretty d3 visualization for the codeFrequency dataset
 */

angular.module('hrStats')
.directive('codeFrequency', ['d3', '$document', function(d3, $document){
  var link = function(scope, element, attrs) {
    /**
     * Window setup
     * TODO: Make responsive
     */

    // Window constraints
    var width = $document[0].body.clientWidth;
    var height = 50;

    // Colors
    var white = '#EEEEEE';
    var blue = '#2874DC';

    /**
     * Scale
     */

    var totalAdditions = scope.data.reduce(function(total, repo){
      return repo.additions + total;
    }, 0);

    var totalDeletions = scope.data.reduce(function(total, repo){
      return repo.deletions + total;
    }, 0);

    // Additions scale :: repo.additions -> svg width
    var additionScale = d3.scale.linear()
                           .domain([0, totalAdditions])
                           .range([0, width]);

    // Deletions scale :: repo.deletions -> svg width
    var deletionScale = d3.scale.linear()
                           .domain([0, totalDeletions])
                           .range([0, width]);

    /**
     * Scope.render -> straight up d3
     */

    scope.render = function(data) {
      console.log('data inside scope.render ', data);
      
      /**
       * Additions
       */
      
      // Initialize
      var additionsSoFar = 0; // keeps track of where to put additions data
      var additions = d3.select('#additions').append('svg');
      additions.attr('width', width).attr('height', height);

      additions.selectAll('*')
        .data(data).enter()
        .append('svg:rect')
        .attr('height', 50)
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




        // /**
        //  * Deletions
        //  */


        // // Initialize
        // var deletionsSoFar = 0; // keeps track of where to put deletion data
        // var deletions = d3.select('#deletions').append('svg');
        // deletions.attr('width', width).attr('height', height);

        // deletions.selectAll('*')
        //   .data(data).enter()
        //   .append('svg:rect')
        //   .attr('height', 50)
        //   .attr('width', function(d,i) {
        //     return deletionScale(d.deletions);
        //   })
        //   .attr('x', function(d,i) {
        //     deletionsSoFar += d.deletions;
        //     return deletionScale(deletionsSoFar - d.deletions);
        //   })
        //   .style('fill', function(d,i) {
        //     return i % 2 === 0 ? white : blue;
        //   });
    };

    scope.render(scope.data);
  };

  return {
    restrict: 'E',
    scope: {
      data: '='
    },
    link: link
  };
}]);