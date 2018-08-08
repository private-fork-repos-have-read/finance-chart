import { MovableRange } from './range';

describe('Construct MovableRange', () => {
  test('Should construct without exception', () => {
    new MovableRange([], 50);
  });
  test('MovableRange#position should be the end index when length is greater than the length of data', () => {
    const range = new MovableRange([0, 1, 2], 50);
    expect(range.endPosition).toBe(3);
  });
});

describe('MovableRange#move', () => {
  test('Should move correctly', () => {
    const data = [1, 2, 3, 4, 5, 6];
    const range = new MovableRange<number>(data, 3);
    expect(range.endPosition).toBe(data.length);
    expect(range.move(-1)).toBeTruthy();
    expect(range.endPosition).toBe(data.length - 1);
    expect(range.move(2)).toBeTruthy();
    expect(range.endPosition).toBe(data.length);
  });
  test('Should return false when visible did not change', () => {
    const data = [1, 2, 3, 4, 5, 6];
    const range = new MovableRange<number>(data, 3);
    expect(range.move(100)).toBeFalsy();
    expect(range.endPosition).toBe(data.length);
    expect(range.move(1)).toBeFalsy(); // visible range should not change
    expect(range.move(-1)).toBeTruthy();
    expect(range.endPosition).toBe(data.length - 1);
    expect(range.move(-100)).toBeTruthy();
    expect(range.endPosition).toBe(3);
  });
});

describe('MovableRange#visible', () => {
  test('Not enough data shouldn\'t move', () => {
    const notEnoughData = [1, 2, 3];
    const notEnoughMovableRange = new MovableRange<number>(notEnoughData, 50);
    expect(notEnoughMovableRange.visible()).toEqual(notEnoughData);
    expect(notEnoughMovableRange.move(-1)).toBeFalsy();
    expect(notEnoughMovableRange.move(5)).toBeFalsy();
    expect(notEnoughMovableRange.visible()).toEqual(notEnoughData);
  });
  test('Enough data should move visible range', () => {

    const enoughMovableRange = new MovableRange<number>([1, 2, 3, 4, 5], 3);
    expect(enoughMovableRange.visible()).toEqual([3, 4, 5]);

    expect(enoughMovableRange.move(-1)).toBeTruthy();
    expect(enoughMovableRange.visible()).toEqual([2, 3, 4]);
    expect(enoughMovableRange.move(-100)).toBeTruthy();
    expect(enoughMovableRange.visible()).toEqual([1, 2, 3]);
    expect(enoughMovableRange.move(100)).toBeTruthy();
    expect(enoughMovableRange.move(100)).toBeFalsy();
    expect(enoughMovableRange.visible()).toEqual([3, 4, 5]);
  });
});

describe('MovableRange#setData', () => {
  test('Set the same amount data should keep end position', () => {
    const data0 = [0, 1, 2];
    const data1 = [3, 4, 5];
    const range = new MovableRange(data0, 2);
    expect(range.endPosition).toBe(data0.length);
    range.setData(data1);
    expect(range.endPosition).toBe(data0.length);
  });
  test('Set more data should keep end position', () => {
    const data0 = [0, 1, 2, 3, 4];
    const data1 = [-2, -1, 0, 1, 2, 3, 4];
    const range = new MovableRange(data0, 2);
    range.move(-2);
    expect(range.endPosition).toBe(data0.length - 2);
    range.setData(data1);
    expect(range.endPosition).toBe(data1.length - 2);
  });
  test('Set less data should reset end position to the end', () => {
    const data0 = [0, 1, 2, 3, 4];
    const data1 = [1, 2];
    const range = new MovableRange(data0, 2);
    range.setData(data1);
    expect(range.endPosition).toBe(data1.length);
    expect(range.visible()).toEqual([1, 2]);
    range.setData([0]);
    expect(range.endPosition).toBe(1);
  });
});
describe('MovableRange#visibleStartIndex', () => {
  test('Should return correct visible start index', () => {
    const data = [0, 1, 2, 3, 4];
    const range = new MovableRange(data, 2);
    expect(range.visibleStartIndex()).toBe(3);
    range.setVisibleLength(10);
    expect(range.visibleStartIndex()).toBe(0);
    range.setVisibleLength(1);
    expect(range.visibleStartIndex()).toBe(4);
    range.setVisibleLength(0);
    expect(range.visibleStartIndex()).toBe(5);
  });
});
describe('MovableRange#recenter', () => {
  test('Should recenter visible data corretly', () => {
    const data = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    const range = new MovableRange(data, 4);
    range.recenter(1, 5);
    expect(range.visible()).toEqual([4, 5, 6, 7, 8]);
    range.recenter(0, 3);
    expect(range.visible()).toEqual([3, 4, 5]);
    range.recenter(2, 8);
    expect(range.visible()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});
