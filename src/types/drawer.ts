import { Drawer } from '../chart/drawer';
import { IDrawerPluginConstructor, IExclusiveDrawerPluginConstructor } from './drawer-plugin';
/**
 * 绘图器初始化选项
 */
export interface IDrawerOptions {
  /**
   * @property 普通插件，每次绘制过程，所有插件同时执行
   */
  plugins: IDrawerPluginConstructor[];
  /**
   * @property 互斥插件，每次绘制过程，只能有一个插件激活并执行
   */
  exclusivePlugins?: IExclusiveDrawerPluginConstructor[];
  /**
   * @property 默认选中的互斥插件
   */
  defaultExclusivePlugins?: number;
}

export type IDrawerContructor = typeof Drawer;

export interface IRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface IPoint {
  x: number;
  y: number;
}
