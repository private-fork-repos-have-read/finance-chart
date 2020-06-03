import { max } from 'd3-array';
import uniq from 'lodash.uniq';
import { drawYAxis } from '../.././paint-utils/index';
import { determineCandleColor } from '../../algorithm/color';
import { divide } from '../../algorithm/divide';
import { MovableRange } from '../../algorithm/range';
import { Chart } from '../chart';
import { ChartTitle } from '../chart-title';
import { Drawer } from '../drawer';

import { autoResetStyle } from '../../helper/class-decorator';

import { IChartTheme } from '../../types/chart-theme';
import { IYAxisDetail } from '../../types/chart';
import { IDrawerOptions } from '../../types/drawer';
import { ICandleStickData, ITimeSeriesData, IVolumeData } from '../../types/data-structure';

export interface VolumeTheme extends IChartTheme {
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

function humanNumber(number: any, p = 2, placeHolder = '--') {
  if (typeof number === 'string') { return number; }
  if (Number.isNaN(number) || number === null || number === undefined) { return placeHolder; }
  const ds = [[9, 6, 3, 0], ['B', 'M', 'K', '']];
  const sign = number > 0 ? 1 : -1;
  const absNum = Math.abs(number);
  const n = absNum.toString().split('.').shift();
  const digit = n.split('').length;
  const pre = Number.parseInt(n, 10);
  let i = 0;
  while (i <= ds[0].length) {
    const f = ds[0][i] as number;
    if (digit / f > 1) {
      const v = (pre / Math.pow(10, f) * sign).toFixed(p);
      return `${ v }${ ds[1][i] }`;
    }
    i += 1;
  }
}

const volumeLabel = (v: number) => {
  const scaleV = v / VolumeDrawer.proportion;
  return `VOL: ${ scaleV }`;
};

/**
 * Volume chart drawer
 */
export abstract class VolumeDrawer extends Drawer {
  public static proportion = 100;
  public static unit = '手';
  public theme: VolumeTheme;
  public titleDrawer: ChartTitle;
  public range: MovableRange<IVolumeData>;

  constructor(chart: Chart, options: IDrawerOptions) {
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

  protected abstract calcDeltaPrice(currentValue: object, currentIndex: number, data: object[]): number;

  public setRange(range: MovableRange<IVolumeData>) {
    const data = range.visible();
    if (data.length > 0) {
      this.maxValue = max(data, (d) => d.volume);
    } else {
      this.maxValue = 1000 * VolumeDrawer.proportion;
    }

    this.minValue = 0;

    super.setRange(range);
  }

  public getYAxisDetail(y: number): IYAxisDetail {
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
        let r = humanNumber(v);
        if (useWUnit && i === tickValues.length - 1) {
          r = `${ r }${ VolumeDrawer.unit }`;
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

/**
 * 分时图成交量绘图器
 */
export class TimeSeriesVolumeDrawer extends VolumeDrawer {
  public calcDeltaPrice(currentValue: ITimeSeriesData, currentIndex: number, data: ITimeSeriesData[]): number {
    if (currentIndex === 0) {
      return 1;
    }
    return currentValue.price - data[currentIndex - 1].price;
  }
}

/**
 * 蜡烛图成交量绘图器
 */
export class CandleStickVolumeDrawer extends VolumeDrawer {
  public range: MovableRange<ICandleStickData>;

  public calcDeltaPrice(currentValue: ICandleStickData, currentIndex: number): number {
    const range = this.range;
    return determineCandleColor(currentValue, currentIndex, range);
  }
}
