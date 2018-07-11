import { ScaleLinear, scaleLinear } from 'd3-scale';
import clamp from 'lodash.clamp';
import { MovableRange } from '../algorithm/range';
import { TITLE_HEIGHT, TITLE_MARGIN_BOTTOM, X_AXIS_HEIGHT } from '../constants/constants';
import { Rect } from '../graphic/primitive';
import { TradeTime } from '../index';
import { Chart, YAxisDetail } from './chart';
import {
  DrawerPlugin,
  DrawerPluginConstructor,
  ExclusiveDrawerPlugin,
  ExclusiveDrawerPluginConstructor,
} from './drawer-plugin';

export interface DrawerOptions {
    plugins: DrawerPluginConstructor[];
    exclusivePlugins?: ExclusiveDrawerPluginConstructor[];
    defaultExclusivePlugins?: number;
}

export class Drawer {
  public plugins: DrawerPlugin[] = [];
  public exclusivePlugins: ExclusiveDrawerPlugin[] = [];
  public context: CanvasRenderingContext2D;
  public frame: Rect = { x: 0, y: 0, width: 0, height: 0};
  public chartFrame: Rect = { x: 0, y: 0, width: 0, height: 0};
  public yScale: ScaleLinear<number, number>;
  public range: MovableRange<object>;
  public selectedIndex: number;
  public minValue = 0;
  public maxValue = 0;
  public tradeTime: TradeTime;
  protected selectedExclusivePlugin = 0;
  private _xAxisTickHeight = X_AXIS_HEIGHT;
  constructor(
    public chart: Chart,
    protected options: DrawerOptions = {
      plugins: [],
      exclusivePlugins: [],
      defaultExclusivePlugins: -1,
    }) {
    this.context = chart.context;
    this.selectedIndex = null;
    this.tradeTime = new TradeTime(chart.options.tradeTimes);
    this.setRange(chart.movableRange);
    this.installPlugin();
  }
  public update() {
    // implement nothing
    this.predraw();
    this.draw();
    this.postdraw();
  }
  public drawFrontSight() {
    // implement nothing
  }
  public resize(frame: Rect) {
    const { resolution } = this.chart.options;
    this.frame = frame;
    this.chartFrame = {
      ...frame,
      y: frame.y + this.titleHeight,
      height: frame.height -
        this.titleHeight -
        this.xAxisTickHeight,
    };
    this.resetYScale();
  }
  public setRange(range: MovableRange<object>) {
    this.range = range;
    this.pluginCall('onSetRange');
    this.resetYScale();
  }
  public select(i: number) {
    this.selectedIndex = i;
  }
  public getYAxisDetail(y: number): YAxisDetail {
    return {
      left: null,
      right: null,
    };
  }
  public getXAxisDetail(i: number): string {
    return null;
  }
  public count(): number {
    return 0;
  }
  public nextExclusivePlugin() {
    const pluginsCount = this.exclusivePlugins.length;
    if (pluginsCount === 0) {
      throw Error(`expect exclusive plugin exist, but only 0 plugin`);
    }
    this.selectedExclusivePlugin = (this.selectedExclusivePlugin + 1) % pluginsCount;
  }
  public useExclusivePlugin(index: number) {
    if (index < -1 || index >= this.exclusivePlugins.length) {
      throw new Error('index out of bound');
    }
    this.selectedExclusivePlugin = index;
  }
  public topValue = () => {
    return this.maxValue * (1 + Math.sign(this.maxValue) * 0.01);
  }
  public bottomValue = () => {
    return this.minValue * (1 - Math.sign(this.minValue) * 0.01);
  }
  protected predraw() {
    this.pluginCall('predraw');
  }
  protected draw() {
    this.pluginCall('draw');
  }
  protected postdraw() {
    this.pluginCall('postdraw');
  }
  public get titleHeight() {
    return TITLE_HEIGHT * this.chart.options.resolution;
  }
  protected set xAxisTickHeight(value) {
    this._xAxisTickHeight = value;
  }
  protected get xAxisTickHeight() {
    return this._xAxisTickHeight * this.chart.options.resolution;
  }
  protected resetYScale() {
    const { chartFrame } = this;
    const resolution = this.chart.options.resolution;
    this.yScale = scaleLinear()
      .domain([this.bottomValue(), this.topValue()])
      .range([chartFrame.y + chartFrame.height, chartFrame.y + TITLE_MARGIN_BOTTOM * resolution]);
  }
  private installPlugin() {
    this.options.plugins.forEach((Plugin) => {
      this.plugins.push(new Plugin(this));
    });
    this.options.exclusivePlugins && this.options.exclusivePlugins.forEach((Plugin) => {
      this.exclusivePlugins.push(new Plugin(this));
    });
    this.useExclusivePlugin(this.options.defaultExclusivePlugins);
  }
  private pluginCall<
    T extends keyof DrawerPlugin,
    U extends keyof ExclusiveDrawerPlugin
  >(fnName: U, ...args: any[]) {
    this.plugins.forEach((plugin) =>
      (plugin[fnName] as () => void)
        .apply(plugin, args));
    const exp = this.exclusivePlugins[this.selectedExclusivePlugin];
    exp && (exp[fnName] as () => void).apply(exp, args);
  }
}
export type DrawerContructor = typeof Drawer;
