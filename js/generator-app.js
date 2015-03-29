﻿//TODO: testing

var generatorApp = angular.module('cosmicApp', ['ngStorage']);

//Data backend
generatorApp.factory('CosmicData', ['$http',function($http) {
  var all = {}, names = [], init = false;

  var promise = $http.get("data/aliens.json").success(function(data) {
    data.forEach(function(alien) {
      all[alien.name] = alien;
      names.push(alien.name);
    });
    init = true;
  });

  return {
    ready: function(func) {
      if(!init) promise.success(func);
      else func();
    },
    getAllAlienNames: function(){ return names.slice(0); },
    getAlien: function(name) { return all[name] || {} }
  };

}]);

generatorApp.filter('unsafe', ['$sce', function($sce) {
  return function(val) { return $sce.trustAs($sce.HTML, val); };
}]);

//Turn alien level into Bootstrap class name for colors
generatorApp.filter('levelClass', function() {
  var levelToClassMapping = ["success", "warning", "danger"];
  return function(input) { return levelToClassMapping[input]; };
});

//Turn alien level into a string of stars to show level
generatorApp.filter('levelStars', function() {
  return function(input) {
    var stars = '';
    for(var i = 0; i <= input; i++) { stars += '★'; }
    return stars;
  };
});

//Turn alien object into a panel with its information
//TODO: game setup or alien conflict
generatorApp.directive("alienPanel", function() {
  return {
    restrict: "E",
    scope: { alien : "=alien"},
    templateUrl : "partials/alien-panel.html"
  };
});

//Based on settings, allow user to pick aliens randomly
generatorApp.controller('GeneratorCtrl', ["$scope", "CosmicData", '$localStorage','$sessionStorage', function($scope, $data, $localStorage, $sessionStorage) {
  $localStorage.$default({
    complexities : [true, true, true],
    games: { E: true },
    namesToExclude : [],
    setupLevel: "0",
    numToChoose: 2,
    preventConflicts : true
  });
  
  //Include
  $scope.complexities = $localStorage.complexities;
  $scope.games = $localStorage.games;

  //Exclude
  $scope.namesToExclude = $localStorage.namesToExclude;
  $scope.setupLevel = $localStorage.setupLevel;

  //Choose
  $scope.numToChoose = $localStorage.numToChoose;
  $scope.preventConflicts = $localStorage.preventConflicts;
  
  //Output
  $scope.message = "Loading aliens...";
  $scope.aliensToShow = [];
  

  //Status
  var current = [], given = [], restricted = [], pool = [];
  $scope.all_names = [];
  $scope.numCurrent = function() { return current.length; };
  $scope.numGiven = function() { return given.length; };
  $scope.numRestricted = function() { return restricted.length; };
  $scope.numExcluded = function() { return $scope.namesToExclude.length; };
  $scope.numLeft = function() { return pool.length; };

  //Keep choose # within 1 and max. Run when resetting alien list (# might have changed) and changing # to pick
  $scope.restrictNumToChoose = function() {
    var numToGive = $scope.numToChoose;
    var max = $scope.numLeft();
    if(max > 0 && numToGive > max) numToGive = max;
    if(numToGive < 1) numToGive = 1;
    //save("choose", numToGive);
    $scope.numToChoose = numToGive;
  };

  //Determine list of possible choices based on selected options
  function resetGenerator() {
    //Create POOL from aliens that match level and game and are not excluded, and clear other lists
    pool = $scope.all_names.filter(function(name) {
      var e = $data.getAlien(name);
      return $scope.complexities[e.level] && $scope.games[e.game] && $scope.namesToExclude.indexOf(name) < 0 && ($scope.setupLevel === "0" || e.setup === undefined || ($scope.setupLevel === "1" && e.setup !== "color"));
    });
    console.log($scope.namesToExclude);
    given = [];
    current = [];
    restricted = [];

    //SETTINGS.resetHowManyToSelect();//Make sure it's within new limit
    $scope.restrictNumToChoose();
    //Write status
    $scope.message = "List reset.";
    $scope.aliensToShow = [];
  }

  $scope.onSettingChange = function(setting) {
    $localStorage[setting] = $scope[setting];
    resetGenerator();
  };

  var NOT_RESET = 0;
  $scope.reset = function() {
    if(confirm("Reset list of aliens?")) resetGenerator();
    else NOT_RESET++;

    if(NOT_RESET > 2) {
      makePickFinal();
      $scope.message = "Aliens given out so far:"
      $scope.aliensToShow = given.map($data.getAlien);
    }
  };

  //Move current to given and move on
  var makePickFinal = function() {
    given = given.concat(current, restricted).sort();
    restricted = []; current = [];
  };
  //Move current selection back to pool
  var undo = function() {
    pool = pool.concat(current, restricted);
    pool.sort();
    current = []; restricted = [];
  };
  //Choose alien from pool
  var pickAlien = function() {
    //Select name (return if wasn't able to select
    var choice = Math.floor(Math.random() * pool.length);
    if(!pool[choice]) return;
    var name = pool.splice(choice, 1)[0];
    current.push(name);
    current.sort();

    //If current choice has any restrictions, remove them from pool as well
    var alien = $data.getAlien(name);
    if($scope.preventConflicts && alien.restriction) {
      var restrictions = alien.restriction.split(',');
      for(var j = 0; j < restrictions.length; j++) {
        var index = pool.indexOf(restrictions[j]);
        if(index > -1) { restricted.push(pool.splice(index, 1)[0]); }
      }
    }
    //Return select name
    return name;
  };

  $scope.pickAliens = function() {
    makePickFinal();

    //Pick aliens randomly
    var howManyToChoose = $scope.numToChoose;
    for(var i = 0; i < howManyToChoose; i++) {
      var name = pickAlien();
      if(!name) break;
    }

    //If unable to pick desired number, undo
    if(current.length < howManyToChoose) {
      undo();
      $scope.aliensToShow = [];
      $scope.message = "Not enough potential aliens left." + ($scope.preventConflicts ? " It's possible that the \"Prevent conflicts\" option is preventing me from displaying remaining aliens." : "");
      return;
    }

    //Display
    $scope.message = "Choices:";
    $scope.aliensToShow = current.map($data.getAlien);
    $scope.restrictNumToChoose();
    return;
  };

  $scope.hide = function() {
    $scope.aliensToShow = [];
    $scope.message = "Choices hidden.";
  };

  $scope.show = function() {
    //Ask for initial of one of the aliens before reshowing them
    var initials = current.map(function(e) { return e[0].toLowerCase(); });
    if(initials.indexOf((prompt("Enter the first initial of one of the aliens you were given, then click OK.") || "").toLowerCase()) < 0) {
      $scope.message = "Wrong letter.";
      return;
    }

    //If passed, then show aliens
    $scope.message = "Choices:"
    $scope.aliensToShow = current.map($data.getAlien);
  };

  $scope.redo = function() {
    if(confirm("Redo?")) {
      undo();
      $scope.pickAliens();
    }
  };
  
  //Init generator
  $data.ready(function() {
    $scope.all_names = $data.getAllAlienNames();
    resetGenerator();
  });
}]);