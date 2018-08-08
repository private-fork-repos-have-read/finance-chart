import { Drawer } from './drawer';

export class DrawerPlugin {
  constructor(protected pluginHost: Drawer) {
  }
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
export class ExclusiveDrawerPlugin extends DrawerPlugin {}

export type DrawerPluginConstructor = typeof DrawerPlugin;
export type ExclusiveDrawerPluginConstructor = typeof ExclusiveDrawerPlugin;
