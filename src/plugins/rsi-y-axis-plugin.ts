import { IDrawerPluginConstructor } from '../types/drawer-plugin';
import { createYAxisPlugin } from './y-axis-plugin';

export function createRSIYAxisPlugin(): IDrawerPluginConstructor {
  return class RSIYAxisPlugin extends createYAxisPlugin([30, 50, 70]) {
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
