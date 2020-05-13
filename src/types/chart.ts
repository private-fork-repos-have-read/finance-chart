import { Chart } from '../chart/chart';
import { IChartTheme } from './chart-theme';

import { IDrawerOptions, IDrawerContructor } from './drawer';
import { ITradeTimeSegment } from './trade';

export interface IYAxisDetail {
  left: string;
  right?: string;
}

export interface IDrawerConfig {
  constructor: IDrawerContructor;
  options?: IDrawerOptions;
}

export interface IChartDetail {
  name: string;
  value: string;
  color: string;
}

export interface IChartOptions {
  /**
   * 用于放置图表的dom节点或dom节点选择器
   */
  selector: string | HTMLElement;

  /**
   * 昨收价
   */
  lastPrice: number;

  /**
   * 数据, 数据格式参考demo
   */
  data: any[];

  /**
   * 金融产品交易时间段
   */
  tradeTimes: ITradeTimeSegment[];

  /**
   * 主图绘图器配置
   */
  mainDrawer: IDrawerConfig;

  /**
   * 主题配置，内置黑白两套主题, 默认使用黑色主题
   */
  theme?: IChartTheme;

  /**
   * 设备像素比, 通常不需要主动设置
   * 在性能较差的设备可主动设置为1，提高性能, 降低画面质量
   */
  resolution?: number;

  /**
   * 默认绘制数据项数量
   * 例如默认需要绘制50项，即显示50根k线
   * 分时图绘制数据项数量只取决于交易时间, 忽略此配置
   */
  count?: number;

  /**
   * 最小绘制数据项数量，控制缩放范围
   */
  minCount?: number;

  /**
   * 最大绘制数据项数量，控制缩放范围
   */
  maxCount?: number;

  /**
   * 主图大小屏占比，默认为0.6, 不配置副图时，屏占比为1，即占满绘图区域
   */
  mainRatio?: number;

  /**
   * 默认选中副图
   */
  selectedAuxiliaryDrawer?: number;

  /**
   * 副图配置
   */
  auxiliaryDrawers?: IDrawerConfig[];

  /**
   * 查看详情数据委托，返回用于显示的详情数据
   */
  detailProvider?:
    (selectedIndex: number, data: any[]) => {
      title: string;
      tables: IChartDetail[]
    };

  /**
   * 加载更多数据委托
   */
  onMoreData?:
    (this: Chart, tep: number) => void | Promise<any[]>;
}
