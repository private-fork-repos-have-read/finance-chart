export interface IVolumeData {
  volume: number;
}

export interface ICandleStickData extends IVolumeData {
  time: string;
  open: number;
  close: number;
  high: number;
  low: number;
}

export interface ITimeSeriesData extends IVolumeData {
  price: number;
  avg: number;
  time: number;
}
