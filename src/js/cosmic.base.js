﻿(function () {
  "use strict";
  let mod = angular.module('cc.base', ['ngMaterial']);

  //Cosmic Theme
  mod.config(['$mdThemingProvider', function (ThemeProvider) {
    ThemeProvider.theme('default').primaryPalette('deep-purple').accentPalette('amber');
  }]);

  mod.value('gameInitials', ['E', 'A', 'C', 'D', 'I', 'S']);

  //Turn game initial into game name
  mod.filter('gameName', function () {
    let games = {
      E: "Encounter",
      A: "Alliance",
      C: "Conflict",
      D: "Dominion",
      I: "Incursion",
      S: "Storm"
    };
    return initial => 'Cosmic ' + games[initial];
  });

  mod.component("cosmicDrawer", {
    template: `
<md-sidenav md-whiteframe="2" class ="md-sidenav-left" md-component-id="left">
	<md-toolbar class ="md-tall">
		<div class ="md-toolbar-tools">
			<h2>Cosmic Companion</h2>
		</div>
	</md-toolbar>
	<md-content>
		<md-list>
			<md-list-item><md-button href="index.html">Home</md-button></md-list-item>
			<md-subheader class ="md-no-sticky">Tools</md-subheader>
			<md-list-item><md-button href="generator.html" ng-disabled="$ctrl.page === 'generator'">Alien Generator</md-button></md-list-item>
			<md-list-item><md-button href="reference.html" ng-disabled="$ctrl.page === 'reference'">Alien Reference</md-button></md-list-item>
			<md-list-item>
				<a href="https://play.google.com/store/apps/details?id=net.fmorel.cosmicgenerator">
					<img src="icons/playstore_badge.png" />
				</a>
			</md-list-item>
		</md-list>
	</md-content>
</md-sidenav>
      `,
    bindings: { page: '<' }
  });

  mod.controller('NavDrawer', ['$mdSidenav', function ($mdSidenav) {
    this.open = () => $mdSidenav('left').open();
  }]);

  mod.filter('groupBy', [function () {

    function groupItems(list, fields, level) {
      if (fields.length < 1) return { value: '', items: list };

      //Group objects by property
      let grouped = {};
      let field = fields[level];
      list.forEach(function (item) {
        let group = item[field];
        grouped[group] = grouped[group] || [];
        grouped[group].push(item);
      });

      //Generate array with named groups
      let result = Object.keys(grouped).map((group) => ({ value: group, items: grouped[group] }));

      //If more fields to group by, go deeper
      if (fields[level + 1]) {
        result = result.map((group) => ({ value: group.value, items: groupItems(group.items, fields, level + 1) }));
      }

      return result;
    }
    //Begin grouping from first level
    return (list, fields) => groupItems(list, fields, 0);
  }]);

})();