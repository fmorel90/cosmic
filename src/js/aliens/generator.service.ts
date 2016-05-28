﻿/// <reference path="../../../typings/project.d.ts" />
interface Storage extends ng.storage.IStorageService {
  complexities: boolean[],
  games: Map<boolean>,
  namesExcluded: string[],
  setupLevel: string,
  numToChoose: number,
  preventConflicts: boolean
}

export interface Status {
  aliens: Alien[],
  message: string,
  limit?: number
}

export interface AllowedActions {
  draw: boolean,
  hide: boolean,
  show: boolean,
  redo: boolean,
  reset: boolean
}

/**
 * Manage aliens given, available, etc
 */
export class Service {
  private empty_status: Status = { aliens: [], message: '' };

  /**
   * Determine list of possible choices based on selected options
   */
  reset: (complexities: boolean[], games: Map<boolean>, namesExcluded: string[], setupLevel: string) => Status;

  /**
   * Show all aliens that have been given out so far
   */
  getAllGiven: () => Status;

  /**
   * Keep choose # within 1 and max. Run when resetting alien list (# might have changed) and changing # to pick
   */
  getChooseLimit(original: number): number { return 0; };

  /**
   * Pick aliens randomly, if possible
   */
  draw: (howManyToChoose: number, preventConflicts?: boolean) => Status;

  /**
   * Hide all aliens (so return nothing to show
   */
  hide: () => Status;

  /**
   * Show current aliens if pass test
   */
  show: () => Status;

  /**
   * Undo last draw, then draw again
   */
  redo: (howManyToChoose: number, preventConflicts?: boolean) => Status;

  /**
   * Get which actions are not allowed
   */
  getDisabledActions: (howManyToChoose: number, numShown: number) => AllowedActions;

  /**
   * Get number given out and size of pool
   */
  getStatus: () => string;

  //Start Generator by getting alien names
  init: ng.IPromise<string[]>;

  constructor(Aliens: IAlienService) {
    let service = this;
    service.init = Aliens.init;

    function namesToAliens(names: string[]): Alien[] {
      return names.sort().map(Aliens.get);
    }

    //Current = currently drawn. Given = previously given/restricted. Restricted = restricted by those currently drawn. Pool = all left to draw from
    let current: string[] = [];
    let given: string[] = [];
    let restricted: string[] = [];
    let pool: string[] = [];

    /**
     * Choose alien from pool
     */
    function drawOne(preventConflicts: boolean): string {
      //Select name (return if wasn't able to select
      let choice = Math.floor(Math.random() * pool.length);
      if (!pool[choice]) return;
      let name = pool.splice(choice, 1)[0];
      current.push(name);

      //If current choice has any restrictions, remove them from pool as well
      let alien: Alien = Aliens.get(name);
      if (preventConflicts && alien.restriction) {
        let restrictions = alien.restriction.split(',');
        for (let j = 0; j < restrictions.length; j++) {
          let index = pool.indexOf(restrictions[j]);
          if (index > -1) { restricted.push(pool.splice(index, 1)[0]); }
        }
      }
      //Return select name
      return name;
    }

    /**
     * Move current to given and move on
     */
    function makePickFinal(): void {
      given = given.concat(current, restricted);
      restricted = []; current = [];
    };

    /**
     * Move current selection back to pool
     */
    function undo(): void {
      pool = pool.concat(current, restricted);
      current = []; restricted = [];
    };

    service.reset = function (complexities, games, namesExcluded, setupLevel) {
      pool = Aliens.getMatchingNames(complexities, games, namesExcluded, setupLevel);
      given = [];
      current = [];
      restricted = [];
      return { aliens: [], message: "List reset." };
    };

    service.getAllGiven = function () {
      makePickFinal();
      return { aliens: namesToAliens(given), message: "Aliens given out so far:" };
    };

    service.getChooseLimit = function (original) {
      let numToGive = original;
      let max = pool.length;
      if (max > 0 && numToGive > max) numToGive = max;
      if (numToGive < 1) numToGive = 1;
      return numToGive;
    };

    service.draw = function (howManyToChoose, preventConflicts = false) {
      makePickFinal();
      for (let i = 0; i < howManyToChoose; i++) {
        let name = drawOne(preventConflicts);
        if (!name) break;
      }

      //If unable to pick desired number, undo
      if (current.length < howManyToChoose) {
        undo();
        return { aliens: [], message: "Not enough potential aliens left." + (preventConflicts ? " It's possible that the \"Prevent conflicts\" option is preventing me from displaying remaining aliens." : "") };
      }

      //Display
      return { aliens: namesToAliens(current), message: "Choices:", limit: service.getChooseLimit(howManyToChoose) };
    };

    service.hide = () => ({ aliens: [], message: "Choices hidden." });

    service.show = function () {
      //Ask for initial of one of the aliens before reshowing them
      let initials = current.map(function (e) { return e[0].toLowerCase(); });
      if (initials.indexOf((prompt("Enter the first initial of one of the aliens you were given, then click OK.") || "").toLowerCase()) < 0) {
        return { aliens: [], message: "Wrong letter." };
      }

      //If passed, then show aliens
      return { aliens: namesToAliens(current), message: "Choices:" };
    }

    service.redo = function (howManyToChoose, preventConflicts = false) {
      if (confirm("Redo?")) {
        undo();
        return service.draw(howManyToChoose, preventConflicts);
      }
      return { aliens: namesToAliens(current), message: "Choices:" }
    };

    service.getDisabledActions = function (howManyToChoose, numShown) {
      return {
        draw: (pool.length < howManyToChoose),
        hide: (numShown < 1),
        show: !(current.length > 0 && numShown < 1),
        redo: (current.length <= 0 || numShown <= 0),
        reset: (current.length <= 0 && given.length <= 0)
      };
    };

    service.getStatus = function () {
      let numGiven = current.length + given.length + restricted.length;
      return numGiven + " of " + (numGiven + pool.length) + " drawn.";
    };
  }
}