import { trimNulls } from '../algorithm/arrays';
import { ChartTitle } from '../chart/chart-title';
import { ExclusiveDrawerPlugin, ExclusiveDrawerPluginConstructor } from '../chart/drawer-plugin';
import { Drawer } from '../index';
import { drawLine } from '../paint-utils/index';

export interface DatumColorMap {
  key: string;
  color: string;
}

export interface TitleBarTheme {
  title: string;
  background: string;
}

export function createLinePlugin(
  config: {
    dataObjectKey: string,
    title: string;
    lineData: DatumColorMap[],
    detailMapper: (key: string, datum: number, index: number) => string
  },
): ExclusiveDrawerPluginConstructor {
  return class LineIndicatorPlugin extends ExclusiveDrawerPlugin {
    public titleDrawer: ChartTitle;
    constructor(protected pluginHost: Drawer) {
      super(pluginHost);
      const theme = pluginHost.chart.theme;
      this.titleDrawer = new ChartTitle(
        this.pluginHost.context,
        config.title,
        config.lineData.map(({key, color}, i) => ({
          label: config.detailMapper(key, 0, i),
          color,
        })),
        theme.titleBackground,
        theme.title,
        this.pluginHost.chart.options.resolution,
      );
    }
    public postdraw() {
      const { yScale, range } = this.pluginHost;
      const { xScale } = this.pluginHost.chart;
      config.lineData.forEach(({key, color}) => {
        const data = range.visible().map((d) => (d as any)[config.dataObjectKey][key]);
        const trimed = trimNulls(data);
        drawLine(
          this.pluginHost.context,
          trimed.result.map((d, i) => ({
            x: xScale(i + trimed.deleted),
            y: yScale(d),
          })),
          color,
          1 * this.pluginHost.chart.options.resolution,
        );
      });
      this.drawTitle(
        this.pluginHost.selectedIndex || this.pluginHost.range.visible().length - 1,
      );
    }
    protected drawTitle(i: number) {
      const { context: ctx, frame, range } = this.pluginHost;
      const data = range.visible();
      const d = data[i];
      if (data.length > 0) {
        config.lineData.forEach(({ key }, i) => {
          const n = (d as any)[config.dataObjectKey][key] || 0;
          this.titleDrawer.setLabel(i, config.detailMapper(key, n, i));
        });
        ctx.clearRect(0, frame.y, frame.width, this.pluginHost.titleHeight);
        this.titleDrawer.draw({
          ...frame,
          height: this.pluginHost.titleHeight,
        });
      }
    }
  };
}
