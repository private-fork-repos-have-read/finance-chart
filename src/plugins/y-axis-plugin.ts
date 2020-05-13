import uniq from 'lodash.uniq';
import { divide } from '../algorithm/divide';
import { IDrawerPlugin, IDrawerPluginConstructor } from '../types/drawer-plugin';
import { drawYAxis, TickValueDescription } from '../paint-utils/index';

export function createYAxisPlugin(ticks: number | number[] = 5, precision = 2): IDrawerPluginConstructor {
  return class YAxisPlugin extends IDrawerPlugin {
    public predraw() {
      const host = this.pluginHost;
      let tickValues: TickValueDescription[];
      if (ticks instanceof Array) {
        tickValues = ticks
          .map((n) => ({ value: n, color: host.chart.theme.yTick}));
      } else {
        tickValues = uniq(
          divide(
            host.bottomValue(),
            host.topValue(),
            ticks,
          ))
          .map((n) => ({ value: n, color: host.chart.theme.yTick}));
      }
      drawYAxis(
        host.context,
        tickValues,
        host.frame,
        host.yScale,
        host.chart.options.resolution,
        true,
        host.chart.theme.gridLine,
        (v: number) => v.toFixed(precision),
      );
    }
  };
}
