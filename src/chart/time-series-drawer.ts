import { max, min } from 'd3-array';
import { area } from 'd3-shape';
import uniq from 'lodash.uniq';
import { formateDate } from '../algorithm/date';
import { divide } from '../algorithm/divide';
import { MovableRange } from '../algorithm/range';
import { drawLine, drawXAxis, drawYAxis } from '../paint-utils/index';
import { Chart } from './chart';
import { ChartTitle } from './chart-title';
import { Drawer } from './drawer';

import { autoResetStyle } from '../helper/class-decorator';

import { ITimeSeriesData } from '../types/data-structure';
import { IYAxisDetail } from '../types/chart';
import { IChartTheme } from '../types/chart-theme';
import { IDrawerOptions } from '../types/drawer';

export interface TimeSeriesTheme extends IChartTheme {
  TimeSeries: {
    price: string;
    linearGradient: string[];
    avg: string;
  };
}
export const TimeSeriesWhiteTheme = {
  price: '#4B99FB',
  linearGradient: [
    'rgba(75, 153, 251, 0.4)',
    'rgba(75, 153, 251, 0)',
  ],
  avg: '#F89D37',
};
export const TimeSeriesBlackTheme = {
  price: '#4B99FB',
  linearGradient: [
    'rgba(75, 153, 251, 0.4)',
    'rgba(75, 153, 251, 0)',
  ],
  avg: '#F89D37',
};

interface ExtraOptions {
  timeChartLabelText: string;
  avgChartLabelText: string;
}

/**
 * 分时图绘图器
 */
export class TimeSeriesDrawer extends Drawer {
  public static precision = 2;
  public theme: TimeSeriesTheme;
  public titleDrawer: ChartTitle;
  public range: MovableRange<ITimeSeriesData>;
  public canScale = false;
  public topValue = ((lastTopValue = Number.MIN_VALUE) =>
    () => {
      if (this.maxValue > lastTopValue) {
        // const extra = clamp(Math.abs(this.maxValue * 0.01), 0.05, 2.5);
        //   console.log('this.maxValue',this.maxValue);
        lastTopValue = this.maxValue + (this.maxValue * 0.01);
      }
      return lastTopValue;
    }
  )();
  public bottomValue = ((lastBottomValue = Number.MAX_VALUE) =>
    () => {
      if (this.minValue < lastBottomValue) {
        // const extra = clamp(Math.abs(this.minValue * 0.01), 0.05, 2.5);
        //   console.log('this.minValue',this.minValue);
        lastBottomValue = this.minValue - (this.minValue * 0.01);
      }
      return lastBottomValue;
    }
  )();
  constructor(chart: Chart, options: IDrawerOptions & ExtraOptions) {
    super(chart, options);
    console.log(options, 'options');
    
    this.theme = Object.assign({
      TimeSeries: TimeSeriesBlackTheme,
    }, this.chart.theme);
    this.xTickFormatter = this.xTickFormatter.bind(this);
    this.context = chart.context;
    this.titleDrawer = new ChartTitle(
      this.context,
      null, [
        {
          label: (options && options.timeChartLabelText) || '分时走势',
          color: this.theme.TimeSeries.price,
        },
        {
          label: (options && options.avgChartLabelText) || '均线',
          color: this.theme.TimeSeries.avg,
        },
      ],
      this.theme.titleBackground,
      'white',
      this.chart.options.resolution,
    );
  }
  public count() {
    return this.tradeTime.totalMinutes();
  }
  public setRange(range: MovableRange<ITimeSeriesData>) {
    const data = range.data;
    if (data.length > 0) {
      const merge = [...data.map((d) => d.price), ...data.map((d) => d.avg)];
      this.minValue = min(merge);
      this.maxValue = max(merge);
    } else {
      this.minValue = this.chart.lastPrice;
      this.maxValue = this.chart.lastPrice;
    }
    super.setRange(range);
  }
  @autoResetStyle()
  public drawFrontSight() {
    const { context: ctx, yScale, range } = this;
    const { xScale } = this.chart;
    const data = range.visible();
    const selectedIndex = this.selectedIndex;
    const x = xScale(selectedIndex);
    const size = 5 * this.chart.options.resolution;
    ctx.beginPath();
    ctx.arc(x, yScale(data[selectedIndex].price), size, 0, Math.PI * 2);
    ctx.fillStyle = this.theme.TimeSeries.price;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, yScale(data[selectedIndex].avg), size, 0, Math.PI * 2);
    ctx.fillStyle = this.theme.TimeSeries.avg;
    ctx.fill();
  }
  public getYAxisDetail(y: number): IYAxisDetail {
    const value = this.yScale.invert(y);
    return {
      left: value.toFixed(2),
      right: this.deltaInPercentage(value),
    };
  }
  public getXAxisDetail(i: number): string {
    return this.xTickFormatter(i);
  }
  protected draw() {
    super.draw();
    const { frame } = this;
    this.drawAxes();
    this.titleDrawer.draw({
      ...frame,
      height: this.titleHeight,
    });
    this.drawTimeSeries();
  }
  protected xTickFormatter(value: number, i?: number) {
    const d = new Date();
    const minute = this.tradeTime.getMinute(value);
    d.setTime(minute * 60 * 1000);
    return formateDate(d, 'HH:mm');
  }
  protected drawYAxis() {
    const lastPrice = this.chart.lastPrice;
    const tickValues = divide(this.bottomValue(), this.topValue()).map((n) => ({
        value: n,
        color: n > lastPrice ? this.theme.rise : this.theme.fall,
    }));
    drawYAxis(
      this.context,
      tickValues,
      this.frame,
      this.yScale,
      this.chart.options.resolution,
      true,
      this.theme.gridLine,
      (v: number) => v.toFixed(TimeSeriesDrawer.precision),
    );
    drawYAxis(
      this.context,
      tickValues,
      this.frame,
      this.yScale,
      this.chart.options.resolution,
      false,
      this.theme.gridLine,
      (v) => this.deltaInPercentage(v),
      'right',
    );
  }
  protected deltaInPercentage(value: number): string {
    const lastPrice = this.chart.lastPrice;
    return `${((value - lastPrice) / lastPrice * 100).toFixed(2)}%`;
  }
  protected drawXAxis() {
    const tickValues = uniq(divide(0, this.chart.count() - 1, 5)
      .map((t) => Math.floor(t)));
    drawXAxis(
      this.context,
      tickValues,
      this.chartFrame,
      this.chart.xScale,
      this.chart.options.resolution,
      true,
      this.theme.gridLine,
      this.xTickFormatter,
      this.theme.xTick,
    );
  }
  protected drawAxes() {
    this.drawXAxis();
    this.drawYAxis();
  }
  @autoResetStyle()
  protected drawTimeSeries() {
    const { frame } = this;
    const { xScale } = this.chart;
    const { context: ctx, yScale, range } = this;
    const drawArea = area<ITimeSeriesData>()
      .x((d, i) => xScale(i))
      .y0((d) => yScale(d.price))
      .y1(frame.height - this.xAxisTickHeight)
      .context(ctx);
    ctx.beginPath();
    drawArea(range.visible());
    const linearGradient = ctx.createLinearGradient(0, 0, 0, frame.height);
    this.theme.TimeSeries.linearGradient.forEach((color, i) =>
      linearGradient.addColorStop(i, color));
    ctx.fillStyle = linearGradient;
    ctx.fill();
    this.drawLine('price', this.theme.TimeSeries.price);
    this.drawLine('avg', this.theme.TimeSeries.avg);
  }
  @autoResetStyle()
  protected drawLine(key: keyof ITimeSeriesData, color = 'black') {
    const { yScale, context: ctx,  range } = this;
    const { xScale } = this.chart;
    drawLine(
      ctx,
      range.visible().map((item, i) => ({
        x: xScale(i),
        y: yScale(item[key]),
      })),
      color,
      1 * this.chart.options.resolution,
    );
  }
}
