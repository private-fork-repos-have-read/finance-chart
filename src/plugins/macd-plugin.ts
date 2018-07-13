import { trimNulls } from '../algorithm/arrays';
import { ChartTitle } from '../chart/chart-title';
import { ExclusiveDrawerPlugin, ExclusiveDrawerPluginConstructor } from '../chart/drawer-plugin';
import { Drawer } from '../index';
import { drawLine } from '../paint-utils/index';
import { DatumColorMap } from './line-indicator-plugin';

export function createMACDPlugin(
  dataDescription: DatumColorMap[] = [
    {
      key: 'dif',
      color: '#FF8E29',
    },
    {
      key: 'dea',
      color: '#ADE3F3',
    },
    {
      key: 'macd',
      color: '#EC6ED9',
    },
  ],
  dataObjectKey = 'macd',
): ExclusiveDrawerPluginConstructor {
  return class MACDPlugin extends ExclusiveDrawerPlugin {
    public titleDrawer: ChartTitle;
    constructor(protected pluginHost: Drawer) {
      super(pluginHost);
      const theme = pluginHost.chart.theme;
      const labels = dataDescription.map(({key, color}, i) => ({
        label: `${key}: 0.00`,
        color,
      }));
      this.titleDrawer = new ChartTitle(
        this.pluginHost.context,
        'MACD',
        labels,
        theme.titleBackground,
        theme.title,
        this.pluginHost.chart.options.resolution,
      );
    }
    public postdraw() {
      const { yScale, range, context } = this.pluginHost;
      const { xScale, theme, options } = this.pluginHost.chart;
      context.save();
      const visibleData = range.visible();
      dataDescription.slice(0, 2).forEach(({key, color}) => {
        const data = visibleData.map((d) => (d as any)[dataObjectKey][key]);
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
      visibleData
      .map((d) => (d as any)[dataObjectKey][dataDescription[2].key])
      .forEach((n, i) => {
        if (!n) {
          return;
        }
        const width = 2 * options.resolution;
        const x = xScale(i) - width / 2;
        if (n <= 0) {
          context.fillStyle = theme.fall;
          const y = yScale(0);
          const height = yScale(n) - y;
          context.fillRect(x, y, width, height);
        } else {
          context.fillStyle = theme.rise;
          const y = yScale(n);
          const height = yScale(0) - y;
          context.fillRect(x, y, width, height);
        }
      });
      this.drawTitle(
        this.pluginHost.selectedIndex || this.pluginHost.range.visible().length - 1,
      );
      context.restore();
    }
    public onSetRange() {
      let minValue = Number.MAX_SAFE_INTEGER;
      let maxValue = Number.MIN_SAFE_INTEGER;
      const data = this.pluginHost.range.visible();
      const all = [
        ...data.map((item) => (item as any)[dataObjectKey].dif),
        ...data.map((item) => (item as any)[dataObjectKey].dea),
        ...data.map((item) => (item as any)[dataObjectKey].macd),
      ];
      for (let i = 0, len = all.length; i < len; ++i) {
        const v = all[i];
        if (v < minValue) {
          minValue = v;
        } else if (v > maxValue) {
          maxValue = v;
        }
      }
      this.pluginHost.minValue = minValue;
      this.pluginHost.maxValue = maxValue;
    }
    protected drawTitle(i: number) {
      const { context: ctx, frame, range } = this.pluginHost;
      const data = range.visible();
      const d = data[i];
      if (data.length > 0) {
        dataDescription.forEach(({ key }, i) => {
          const n = (d as any).macd[key] || 0;
          this.titleDrawer.setLabel(i, `${key.toUpperCase()}: ${n.toFixed(2)}`);
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
