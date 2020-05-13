import { Drawer } from '../chart/drawer';

export class IDrawerPlugin {
  constructor(protected pluginHost: Drawer) {}

  public onSetRange() {
    // implement nothing
  }

  public predraw() {
    // implement nothing
  }

  public draw() {
    // implement nothing
  }

  public postdraw() {
    // implement nothing
  }
}

export class IExclusiveDrawerPlugin extends IDrawerPlugin {}

export type IDrawerPluginConstructor = typeof IDrawerPlugin;
export type IExclusiveDrawerPluginConstructor = typeof IExclusiveDrawerPlugin;
