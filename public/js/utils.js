angular.module('hrInsights.utils', [])

.service('utils', [function(){
  this.getTotal = function(stat, type) {
    return type.reduce(function(total, repo){
      return repo[stat] + total;
    },0);
  };

  this.getMost = function(stat, type) {
    return type.reduce(function(current, repo){
      return current[stat] > repo[stat] ? current : repo;
    },0);
  };

  this.getLeast = function(stat, type) {
    return type.reduce(function(current, repo){
      return current[stat] < repo[stat] ? current : repo;
    },0);
  };

  this.numberWithCommas = function(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  this.numberToHour = function(num) {
    if (num === 0) return '12am';
    if (num === 12) return '12pm';
    return num > 12 ? num - 12 + "pm" : num + "am";
  };

  this.numberToDay = function(num){
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

  this.linesOfCodeMap = function(num) {
    var map = {
      0: "",
      10000: "a simple iPhone game",
      40000: "a photo editing iPhone app",
      80000: "a pacemaker",
      120000: "Photoshop v1 (1990)",
      200000: "Camino (an entire web browser)",
      310000: "the Quake 3 game engine",
      400000: "a Space Shuttle",
      // 1000000: "War And Peace x 14, Ulysses x 25, The Catcher in The Rye x 63",
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

  this.getLastSunday = function(d) {
    var dateUTC = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var lastSunday = new Date(dateUTC.setDate(dateUTC.getDate()-dateUTC.getDay()-1));
    return lastSunday;
  };

}]);