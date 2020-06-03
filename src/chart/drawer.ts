import { ScaleLinear, scaleLinear } from 'd3-scale';
import clamp from 'lodash.clamp';
import { MovableRange } from '../algorithm/range';
import { TITLE_HEIGHT, TITLE_MARGIN_BOTTOM, X_AXIS_HEIGHT } from '../constants/constants';
import { TradeTime } from '../index';

import { Chart } from './chart';
import { IYAxisDetail } from '../types/chart';
import { IDrawerOptions, IRect } from '../types/drawer';

import {
  IDrawerPlugin,
  IExclusiveDrawerPlugin,
} from '../types/drawer-plugin';

/**
 * 绘图器基类
 * 基类提供绘图器需要的基本功能，但不包含任何绘图实现，可以通过派生类覆盖相关函数或使用插件添加职责实现绘图
 */
export class Drawer {
  /**
   * @property 当前在使用的插件
   */
  public plugins: IDrawerPlugin[] = [];
  /**
   * @property 当前在使用的互斥插件
   */
  public exclusivePlugins: IExclusiveDrawerPlugin[] = [];
  /**
   * @property 当前使用的绘图上下文
   */
  public context: CanvasRenderingContext2D;
  /**
   * @property 应绘图区域范围
   */
  public frame: IRect = { x: 0, y: 0, width: 0, height: 0};
  /**
   * @property 除了标题栏区域，应绘图区域范围
   */
  public chartFrame: IRect = { x: 0, y: 0, width: 0, height: 0};
  /**
   * @property y轴 d3.js 线性缩放实例
   */
  public yScale: ScaleLinear<number, number>;
  /**
   * @property 当前用于绘图的数据管理器
   */
  public range: MovableRange<object>;
  /**
   * @property 当前选中数据项, 选中数据项会显示在数据详情界面
   */
  public _selectedIndex: number;
  /**
   * @property 最小数据
   */
  public minValue = 0;
  /**
   * @property 最大数据
   */
  public maxValue = 0;
  /**
   * @property 交易时间管理器实例
   */
  public tradeTime: TradeTime;
  /**
   * @property 允许缩放
   */
  public canScale = true;
  protected selectedExclusivePlugin = 0;
  protected options: IDrawerOptions;
  private _xAxisTickHeight = X_AXIS_HEIGHT;
  constructor(
    public chart: Chart,
    options: IDrawerOptions) {
    this.options = Object.assign({}, {
      plugins: [],
      exclusivePlugins: [],
      defaultExclusivePlugins: 0,
    }, options);
    this.context = chart.context;
    this.selectedIndex = null;
    this.installPlugin();
    this.tradeTime = new TradeTime(chart.options.tradeTimes);
    this.setRange(chart.movableRange);
  }
  get selectedIndex() {
    const visible = this.range.visible();
    return clamp(this._selectedIndex, 0, visible.length - 1);
  }
  set selectedIndex(val) {
    this._selectedIndex = val;
  }
  /**
   * 每次绘图过程，调用一次，需要完全覆盖绘图行为时，在派生类中覆盖此方法
   */
  public update() {
    // implement nothing
    this.predraw();
    this.draw();
    this.postdraw();
  }
  /**
   * 每次绘制十字线后调用，可用于绘制小部件
   */
  public drawFrontSight() {
    // implement nothing
  }
  /**
   * 每次浏览器窗口大小变化后调用
   * @param frame 应绘图区域大小
   */
  public resize(frame: IRect) {
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
  /**
   * 每次数据变化后调用
   * @param range 新数据
   */
  public setRange(range: MovableRange<object>) {
    this.range = range;
    this.pluginCall('onSetRange');
    this.resetYScale();
  }
  /**
   * 选中新的数据项
   * @param i 选中数据项
   */
  public select(i: number) {
    this.selectedIndex = i;
  }
  /**
   * 获取y轴详细描述数据
   * @param y y轴位置
   */
  public getYAxisDetail(y: number): IYAxisDetail {
    return {
      left: this.yScale.invert(y).toFixed(2),
      right: null,
    };
  }
  /**
   * 获取某一项数据详细描述数据
   * @param i 数据项
   */
  public getXAxisDetail(i: number): string {
    return null;
  }
  public count(): number {
    return 0;
  }
  /**
   * 切换下一个互斥插件
   */
  public nextExclusivePlugin() {
    const pluginsCount = this.exclusivePlugins.length;
    if (pluginsCount === 0) {
      throw Error(`expect exclusive plugin exist, but only 0 plugin`);
    }
    this.useExclusivePlugin((this.selectedExclusivePlugin + 1) % pluginsCount);
  }

  /**
   * 使用指定互斥插件
   * @param index 互斥插件序号
   */
  public useExclusivePlugin(index: number) {
    if (this.exclusivePlugins.length === 0) {
      this.selectedExclusivePlugin = -1;
      return;
    }  else if (index < -1 || index >= this.exclusivePlugins.length) {
      throw new Error('index out of bound');
    }
    this.selectedExclusivePlugin = index;
    if (this.range) {
      const plugin = this.exclusivePlugins[this.selectedExclusivePlugin];
      plugin && plugin.onSetRange();
    }
  }

  /**
   * 绘图区间数据最大值，比实际数据最大值略大
   */
  public topValue = () => {
    let extra;

    if (this.maxValue === 0) {
      extra = Math.abs(this.maxValue * 0.01);
    } else {
      extra = clamp(Math.abs(this.maxValue * 0.01), 0.05, 2.5);
    }

    return this.maxValue + extra;
  }
  /**
   * 绘图区间数据最小值，比实际数据最小值略小
   */
  public bottomValue = () => {
    let extra;

    if (this.minValue === 0) {
      extra = Math.abs(this.minValue * 0.01);
    } else {
      extra = clamp(Math.abs(this.minValue * 0.01), 0.05, 2.5);
    }

    return this.minValue - extra;
  }
  /**
   * 绘图前调用，预绘图, 可用于绘制背景，网格线等
   */
  protected predraw() {
    this.pluginCall('predraw');
  }
  /**
   * 绘图时调用，绘图, 绘制最重要的内容
   */
  protected draw() {
    this.pluginCall('draw');
  }

  /**
   * 绘图后调用，绘图后处理, 绘制小部件等
   */
  protected postdraw() {
    this.pluginCall('postdraw');
  }

  /**
   * 标题栏高度, 单位为px
   */
  public get titleHeight() {
    return TITLE_HEIGHT * this.chart.options.resolution;
  }

  protected set xAxisTickHeight(value) {
    this._xAxisTickHeight = value;
  }

  /**
   * x轴高度, 单位为px
   *
   */
  protected get xAxisTickHeight() {
    return this._xAxisTickHeight * this.chart.options.resolution;
  }

  /**
   * ResetYScale
   *
   */
  protected resetYScale() {
    const { chartFrame } = this;
    const resolution = this.chart.options.resolution;
    this.yScale = scaleLinear()
      .domain([this.bottomValue(), this.topValue()])
      .range([chartFrame.y + chartFrame.height, chartFrame.y + TITLE_MARGIN_BOTTOM * resolution]);
  }

  /**
   * InstallPlugin
   *
   */
  private installPlugin() {
    this.options.plugins.forEach((Plugin) => {
      this.plugins.push(new Plugin(this));
    });
    this.options.exclusivePlugins && this.options.exclusivePlugins.forEach((Plugin) => {
      this.exclusivePlugins.push(new Plugin(this));
    });
    this.useExclusivePlugin(this.options.defaultExclusivePlugins);
  }

  /**
   * PluginCall
   *
   */
  private pluginCall<
    T extends keyof IDrawerPlugin,
    U extends keyof IExclusiveDrawerPlugin
  >(fnName: U, ...args: any[]) {
    this.plugins.forEach((plugin) =>
      (plugin[fnName] as () => void)
        .apply(plugin, args));
    const exp = this.exclusivePlugins[this.selectedExclusivePlugin];
    exp && (exp[fnName] as () => void).apply(exp, args);
  }
}
