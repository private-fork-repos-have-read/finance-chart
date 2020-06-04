export interface IChartTheme {
  rise: string;
  fall: string;
  gridLine: string;
  yTick: string;
  xTick: string;
  frontSight: string;
  frontSightLabelBackground: string;
  background: string;
  detailColor: string;
  detailBackground: string;
  title: string;
  titleBackground: string;
  minColor?: string;
  maxColor?: string;
  [key: string]: string | object;
}
