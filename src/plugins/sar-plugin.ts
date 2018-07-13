import { ChartTitle } from '../chart/chart-title';
import { ExclusiveDrawerPlugin, ExclusiveDrawerPluginConstructor } from '../chart/drawer-plugin';
import { CandleStickData, Drawer } from '../index';

export function createSARPlugin(color = '#FF8E29', title = 'SAR'): ExclusiveDrawerPluginConstructor {
  return class SARPlugin extends ExclusiveDrawerPlugin {
    public titleDrawer: ChartTitle;
    constructor(protected pluginHost: Drawer) {
      super(pluginHost);
      const theme = this.pluginHost.chart.theme;
      this.titleDrawer = new ChartTitle(
        this.pluginHost.context,
        title, [
          {
            label: 'BB: 0.00',
            color,
          },
        ],
        theme.titleBackground,
        theme.title,
        this.pluginHost.chart.options.resolution,
      );
    }
    public postdraw() {
      const { yScale, range, context } = this.pluginHost;
      const { xScale, options: { resolution }, theme } = this.pluginHost.chart;
      const visibleData = range.visible() as CandleStickData[];
      const data: number[] = visibleData.map((d) => (d as any).sar.BB);
      const aboveColor = theme.fall;
      const belowColor = theme.rise;
      context.save();
      context.lineWidth = 1 * resolution;
      data.forEach((val, i) => {
        if (val) {
          if (val > visibleData[i].close) {
            context.strokeStyle = aboveColor;
            context.strokeStyle = aboveColor;
          } else {
            context.strokeStyle = belowColor;
          }
          context.beginPath();
          context.arc(xScale(i), yScale(val), 2 * resolution, 0, 2 * Math.PI);
          context.stroke();
        }
      });
      context.restore();

      this.drawTitle(
        this.pluginHost.selectedIndex || this.pluginHost.range.visible().length - 1,
      );
    }
    protected drawTitle(i: number) {
      const { context: ctx, frame, range } = this.pluginHost;
      const data = range.visible();
      const d = data[i];
      if (data.length > 0) {
        const n = (d as any).sar.BB || 0;
        this.titleDrawer.setLabel(0,  `BB: ${n.toFixed(2)}`);
        ctx.clearRect(0, frame.y, frame.width, this.pluginHost.titleHeight);
        this.titleDrawer.draw({
          ...frame,
          height: this.pluginHost.titleHeight,
        });
      }
    }
  };
}
