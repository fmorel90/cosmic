import { Component, Inject, OnInit } from '@angular/core';
import { LOCAL_STORAGE, StorageService } from 'ngx-webstorage-service';
import { AlienService } from '../../aliens/alien.service';
import { Alien, GameSelection, Game } from '../../types';

const STORAGE_PREFIX = 'cosmic.alien-ref';

interface IGroupedItems<T> {
  value: string;
  items: T[] | Array<IGroupedItems<T>>;
}

// todo: options for grouping/ordering

@Component({
  selector: 'alien-reference',
  templateUrl: './page.component.html',
})
export class AlienReferencePageComponent implements OnInit {
  public groups: Array<IGroupedItems<Alien>>;
  public games: GameSelection;
  public levels: boolean[];
  // orderBy: Alien.MandatoryProperties;
  // groupBy: Alien.MandatoryProperties;

  constructor(private Aliens: AlienService, @Inject(LOCAL_STORAGE) private Storage: StorageService) { }

  public ngOnInit() {
    // Set defaults
    this.levels = this.Storage.get(STORAGE_PREFIX + 'levels') || [true, true, true];
    this.games = this.Storage.get(STORAGE_PREFIX + 'games') || { [Game.Encounter]: true };
    this.Aliens.init$.subscribe(() => { this.refresh(); });
  }

  /** Handle game option change */
  public onSelectGame(newGames: GameSelection) {
    this.Storage.set(STORAGE_PREFIX + 'games', newGames);
    this.games = newGames;
    this.refresh();
  }

  /** Handle level option change */
  public onSelectLevel(newLevels: boolean[]) {
    this.Storage.set(STORAGE_PREFIX + 'levels', newLevels);
    this.levels = newLevels;
    this.refresh();
  }

  /** Refresh shown aliens based on settings */
  private refresh() {
    this.groups = groupItems(this.Aliens.getMatchingNames(this.levels, this.games).map(this.Aliens.get), ['game', 'level'], ['name']);
  }
}

/** Group objects by given array of fields */
function groupItems(list: Alien[], gFields: Alien.MandatoryProperties, sFields: Alien.MandatoryProperties, level: number = 0): Array<IGroupedItems<Alien>> {
  if(gFields.length < 1) { return [{ value: '', items: list }]; }

  // group objects by property
  const grouped: Record<string, Alien[]> = {};
  const field = gFields[level];
  list.forEach((item) => {
    const group = item[field];
    grouped[group] = grouped[group] || [];
    grouped[group].push(item);
  });

  // generate array with named groups
  let result: Array<IGroupedItems<Alien>> = Object.keys(grouped).sort().map(group => ({ value: group, items: grouped[group] }));

  // if more fields to group by, go deeper
  if(gFields[level + 1]) {
    result = result.map(group => ({ value: group.value, items: groupItems(group.items as Alien[], gFields, sFields, level + 1) }));
  }

  return result;
}
