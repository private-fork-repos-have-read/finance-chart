import { formateDate } from '../../src/algorithm/date';
import {
  CandleStickDrawer,
  CandleStickVolumeDrawer,
  Chart,
  createBOLLPlugin,
  createDMAPlugin,
  createEMAPlugin,
  createKDJPlugin,
  createKDJYAxisPlugin,
  createMACDPlugin,
  createMAPlugin,
  createRSIPlugin,
  createRSIYAxisPlugin,
  createSARPlugin,
  createSMAPlugin,
  createYAxisPlugin,
  Drawer,
  TimeShareDrawer,
  TimeShareVolumeDrawer,
  VolumeDrawer,
} from '../../src/index';
import './index.scss';
import MOCK_KLINE from './mock-kline';
import MOCK_TIME_SHARE from './mock-time-share';

VolumeDrawer.proportion = 100;
VolumeDrawer.unit = '手';

function createTimeShare() {
  const timeShareChart = new Chart({
    selector: '#time-share',
    resolution: (window.devicePixelRatio || 1),
    count: 0,
    lastPrice: 15.2,
    data: MOCK_TIME_SHARE,
    tradeTimes: [
      {
          open: 90,
          close: 210,
      },
      {
          open: 300,
          close: 421,
      },
    ],
    mainDrawer: {
      constructor: TimeShareDrawer,
    },
    auxiliaryDrawers: [
      {
        constructor: TimeShareVolumeDrawer,
      },
    ],
    detailProvider: (i, data) => {
      const date = new Date();
      date.setTime(data[i].time * 60 * 1000);
      return {
        title: formateDate(date, 'HH:mm'),
        tables: [
          {
            color: 'green',
            name: '开盘',
            value: '10353',
          },
          {
            color: '#7B7E8D',
            name: '开盘',
            value: '10353',
          },
        ],
      };
    },
  });
  function autoUpdateTimeShare() {
    if (MOCK_TIME_SHARE.length < 240 - 1) {
      setTimeout(autoUpdateTimeShare, 500);
    }
    const last = MOCK_TIME_SHARE[MOCK_TIME_SHARE.length - 1];
    const next = {
      time: last.time + 1,
      price: last.price * (Math.random() * 0.02 - 0.01 + 1),
      avg: last.avg * (Math.random() * 0.02 - 0.01 + 1),
      volume: Math.round(last.volume * (Math.random() * 0.6 - 0.3 + 1)),
      holdAmount: Math.round(last.holdAmount * (Math.random() * 0.6 - 0.3 + 1)),
    };
    MOCK_TIME_SHARE.push(next);
    timeShareChart.setData(MOCK_TIME_SHARE);
  }
  autoUpdateTimeShare();
}
function createKLine() {
  (window as any).klineChart = new Chart({
    selector: '#candle-stick',
    count: 50,
    lastPrice: 50.49999809265137,
    data: MOCK_KLINE,
    tradeTimes: [],
    mainDrawer: {
      constructor: CandleStickDrawer,
      options: {
        defaultExclusivePlugins: 4,
        plugins: [
          createYAxisPlugin(),
        ],
        exclusivePlugins: [
          createMAPlugin([
            {
              key: '5',
              color: '#FF8E29',
            },
            {
              key: '10',
              color: '#ADE3F3',
            },
            {
              key: '20',
              color: '#EC6ED9',
            },
            {
              key: '60',
              color: '#01F46A',
            },
          ]),
          createEMAPlugin([
            {
              key: '12',
              color: '#FF8E29',
            },
            {
              key: '50',
              color: '#ADE3F3',
            },
          ]),
          createSMAPlugin([
            {
              key: '5',
              color: '#FF8E29',
            },
            {
              key: '10',
              color: '#ADE3F3',
            },
            {
              key: '20',
              color: '#EC6ED9',
            },
          ]),
          createBOLLPlugin(),
          createSARPlugin(),
        ],
      },
    },
    selectedAuxiliaryDrawer: 2,
    auxiliaryDrawers: [
      {
        constructor: Drawer,
        options: {
          plugins: [
            createYAxisPlugin(),
          ],
          exclusivePlugins: [
            createMACDPlugin(),
          ],
        },
      },
      {
        constructor: CandleStickVolumeDrawer,
      },
      {
        constructor: Drawer,
        options: {
          plugins: [
            createKDJYAxisPlugin(),
          ],
          exclusivePlugins: [
            createKDJPlugin(),
          ],
        },
      },
      {
        constructor: Drawer,
        options: {
          plugins: [
            createRSIYAxisPlugin(),
          ],
          exclusivePlugins: [
            createRSIPlugin([
              {
                key: '1',
                color: '#FF8E29',
              },
              {
                key: '2',
                color: '#ADE3F3',
              },
              {
                key: '3',
                color: '#EC6ED9',
              },
            ], 'rsi'),
          ],
        },
      },
      {
        constructor: Drawer,
        options: {
          plugins: [
            createYAxisPlugin(),
          ],
          exclusivePlugins: [
            createDMAPlugin(),
          ],
        },
      },
    ],
    detailProvider: (i, data) => {
      const WEEK_DAY_MAP: { [index: number]: string} = {
        0: '周日',
        1: '周一',
        2: '周二',
        3: '周三',
        4: '周四',
        5: '周五',
        6: '周六',
      };
      const date = new Date(data[i].time.replace(/-/g, '/'));
      return {
        title: `${formateDate(date, 'yyyy/MM/dd')} ${WEEK_DAY_MAP[date.getDay()]}`,
        tables: [
          {
            color: 'green',
            name: '开盘',
            value: '10353',
          },
          {
            color: '#7B7E8D',
            name: '开盘',
            value: '10353',
          },
        ],
      };
    },
  });
}
createTimeShare();
createKLine();
