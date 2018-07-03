import { max, min } from 'd3-array';
import { area } from 'd3-shape';
import uniq from 'lodash.uniq';
import { formateDate } from '../algorithm/date';
import { divide } from '../algorithm/divide';
import { MovableRange } from '../algorithm/range';
import { Rect } from '../graphic/primitive';
import { drawLine, drawXAxis, drawYAxis } from '../paint-utils/index';
import { autoResetStyle, Chart, ChartTheme, YAxisDetail } from './chart';
import { ChartTitle } from './chart-title';
import { TimeShareData } from './data-structure';
import { Drawer, DrawerOptions } from './drawer';

export interface TimeShareTheme extends ChartTheme {
  timeShare: {
    price: string;
    linearGradient: string[];
    avg: string;
  };
}
export const TimeShareWhiteTheme = {
  price: '#4B99FB',
  linearGradient: [
    'rgba(75, 153, 251, 0.4)',
    'rgba(75, 153, 251, 0)',
  ],
  avg: '#F89D37',
};
export const TimeShareBlackTheme = {
  price: '#4B99FB',
  linearGradient: [
    'rgba(75, 153, 251, 0.4)',
    'rgba(75, 153, 251, 0)',
  ],
  avg: '#F89D37',
};

export class TimeShareDrawer extends Drawer {
  public theme: TimeShareTheme;
  public titleDrawer: ChartTitle;
  public range: MovableRange<TimeShareData>;
  protected topValue = ((lastTopValue = Number.MIN_VALUE) =>
    () => {
      if (this.maxValue > lastTopValue) {
        lastTopValue = this.maxValue * (1.01);
      }
      return lastTopValue;
    }
  )();
  protected bottomValue = ((lastBottomValue = Number.MAX_VALUE) =>
    () => {
      if (this.minValue < lastBottomValue) {
        lastBottomValue = this.minValue * (0.99);
      }
      return lastBottomValue;
    }
  )();
  constructor(chart: Chart, options: DrawerOptions) {
    super(chart, options);
    this.theme = Object.assign({
      timeShare: TimeShareBlackTheme,
    }, this.chart.theme);
    this.xTickFormatter = this.xTickFormatter.bind(this);
    this.context = chart.context;
    this.titleDrawer = new ChartTitle(
      this.context,
      null, [
        {
          x: 5 * this.chart.options.resolution,
          label: '分时走势',
          color: this.theme.timeShare.price,
        },
        {
          x: 50 + 5 * this.chart.options.resolution,
          label: '均线',
          color: this.theme.timeShare.avg,
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
  public setRange(range: MovableRange<TimeShareData>) {
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
    ctx.fillStyle = this.theme.timeShare.price;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, yScale(data[selectedIndex].avg), size, 0, Math.PI * 2);
    ctx.fillStyle = this.theme.timeShare.avg;
    ctx.fill();
  }
  public getYAxisDetail(y: number): YAxisDetail {
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
    this.drawTimeShare();
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
  protected drawTimeShare() {
    const { frame } = this;
    const { xScale } = this.chart;
    const { context: ctx, yScale, range } = this;
    const drawArea = area<TimeShareData>()
      .x((d, i) => xScale(i))
      .y0((d) => yScale(d.price))
      .y1(frame.height - this.xAxisTickHeight)
      .context(ctx);
    ctx.beginPath();
    drawArea(range.visible());
    const linearGradient = ctx.createLinearGradient(0, 0, 0, frame.height);
    this.theme.timeShare.linearGradient.forEach((color, i) =>
      linearGradient.addColorStop(i, color));
    ctx.fillStyle = linearGradient;
    ctx.fill();
    this.drawLine('price', this.theme.timeShare.price);
    this.drawLine('avg', this.theme.timeShare.avg);
  }
  @autoResetStyle()
  protected drawLine(key: keyof TimeShareData, color = 'black') {
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
