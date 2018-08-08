import { DrawerPluginConstructor } from '../chart/drawer-plugin';
import { createYAxisPlugin } from './y-axis-plugin';

export function createKDJYAxisPlugin(): DrawerPluginConstructor {
  return class KDJYAxisPlugin extends createYAxisPlugin([20, 50, 80]) {
    public onSetRange() {
      const host = this.pluginHost;
      if (host.minValue > 0) {
        host.minValue = 0;
      }
      if (host.maxValue < 100) {
        host.maxValue = 100;
      }
    }
  };
}
