import { max } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import uniq from 'lodash.uniq';
import { drawXAxis, drawYAxis } from '../.././paint-utils/index';
import { determineCandleColor } from '../../algorithm/color';
import { divide } from '../../algorithm/divide';
import { MovableRange } from '../../algorithm/range';
import { autoResetStyle, Chart, ChartTheme, YAxisDetail } from '../chart';
import { ChartTitle } from '../chart-title';
import { CandleStickData, TimeSeriesData, VolumeData } from '../data-structure';
import { Drawer, DrawerOptions } from '../drawer';

export interface VolumeTheme extends ChartTheme {
  volume: {
    same: string;
    volumeText: string;
  };
}
export const VolumeWhiteTheme = {
  same: '#5E6572',
  volumeText: '#F78081',
};
export const VolumeBlackTheme = {
  same: '#5E6572',
  volumeText: '#F78081',
};

const shortenVolume = (v: number) => {
  const scaleV = v / VolumeDrawer.proportion;
  if (scaleV > 10000) {
    return (scaleV / 10000).toFixed(2);
  }
  return scaleV.toFixed(2);
};
const volumeLabel = (v: number) => {
  const scaleV = v / VolumeDrawer.proportion;
  if (scaleV > 10000) {
    return `VOL: ${(scaleV / 10000).toFixed(2)}万`;
  }
  return `VOL: ${scaleV.toFixed(2)}`;
};
/**
 * Volume chart drawer
 */
export class VolumeDrawer extends Drawer {
  public static proportion = 100;
  public static unit = '手';
  public theme: VolumeTheme;
  public titleDrawer: ChartTitle;
  public range: MovableRange<VolumeData>;
  constructor(chart: Chart, options: DrawerOptions) {
    super(chart, options);
    this.theme = Object.assign({
      volume: VolumeBlackTheme,
    }, this.chart.theme);
    this.xAxisTickHeight = 0;
    this.context = chart.context;
    this.titleDrawer = new ChartTitle(
      this.context,
      '成交量', [
        {
          label: volumeLabel(0),
          color: this.theme.volume.volumeText,
        },
      ],
      this.theme.titleBackground,
      this.theme.title,
      this.chart.options.resolution,
    );
  }
  public calcDeltaPrice(currentValue: object, currentIndex: number, data: object[]): number {
    return 1;
  }
  public setRange(range: MovableRange<VolumeData>) {
    const data = range.visible();
    if (data.length > 0) {
      this.maxValue = max(data, (d) => d.volume);
    } else {
      this.maxValue = 1000 * VolumeDrawer.proportion;
    }
    this.minValue = 0;
    super.setRange(range);
  }
  public getYAxisDetail(y: number): YAxisDetail {
    return {
      left: shortenVolume(this.yScale.invert(y)),
    };
  }
  protected draw() {
    const data = this.range.visible();
    this.drawAxes();
    this.drawTitle(this.selectedIndex || data.length - 1);
    this.drawVolumes();
  }
  protected drawAxes() {
    this.drawYAxis();
  }
  protected drawYAxis() {
    const tickValues = uniq(
      divide(this.minValue, this.maxValue, 3))
        .map((n) => ({ value: Math.round(n), color: this.theme.yTick }),
    );
    tickValues.shift(); // remove first item, 0 volume
    const maxTickValue =
      max(tickValues, (d) => d.value) / VolumeDrawer.proportion;
    const useWUnit = maxTickValue > 10000;
    drawYAxis(
      this.context,
      tickValues,
      this.frame,
      this.yScale,
      this.chart.options.resolution,
      true,
      this.theme.gridLine,
      (v, i) => {
        // const scaledV = v / VolumeDrawer.proportion
        let r = shortenVolume(v);
        if (useWUnit && i === tickValues.length - 1) {
          r =  `${r}万${VolumeDrawer.unit}`;
        }
        return r;
      },
    );
  }
  @autoResetStyle()
  protected drawVolumes() {
    const { xScale } = this.chart;
    const { context: ctx, yScale, chartFrame, range } = this;
    const data = range.visible();
    data.forEach((d, i) => {
      const deltaPrice = this.calcDeltaPrice(d, i, data);
      if (deltaPrice > 0) {
        ctx.fillStyle = this.theme.rise;
      } else if (deltaPrice < 0) {
        ctx.fillStyle = this.theme.fall;
      } else {
        ctx.fillStyle = this.theme.volume.same;
      }
      const x = xScale(i);
      const y = yScale(d.volume);
      const height = chartFrame.height - (y - chartFrame.y);
      let width = xScale(1) - xScale(0);
      width -= width * 0.2;
      ctx.fillRect(x - width / 2, y, width, height);
    });
  }
  private drawTitle(i: number) {
    const data = this.range.visible();
    const d = data[i];
    this.titleDrawer.setLabel(0, volumeLabel(d ? data[i].volume : 0));
    this.titleDrawer.draw({
      ...this.frame,
      height: this.titleHeight,
    });
  }
}
export class TimeSeriesVolumeDrawer extends VolumeDrawer {
  public calcDeltaPrice(currentValue: TimeSeriesData, currentIndex: number, data: TimeSeriesData[]): number {
    if (currentIndex === 0) {
      return 1;
    }
    return currentValue.price - data[currentIndex - 1].price;
  }
}
export class CandleStickVolumeDrawer extends VolumeDrawer {
  public range: MovableRange<CandleStickData>;
  public calcDeltaPrice(currentValue: CandleStickData, currentIndex: number): number {
    const range = this.range;
    return determineCandleColor(currentValue, currentIndex, range);
  }
}
