import { Chart } from '../chart/chart';

export function autoResetStyle() {
  // tslint:disable-next-line:only-arrow-functions
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const raw = target[propertyKey];
    descriptor.value = function(this: { context: CanvasRenderingContext2D }) {
      this.context.save();
      const r = raw.apply(this, arguments);
      this.context.restore();
      return r;
    };
    return descriptor;
  };
}

export function shouldRedraw() {
  // tslint:disable-next-line:only-arrow-functions
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const raw = target[propertyKey];
    descriptor.value = function(this: Chart) {
      raw.apply(this, arguments);
      this.drawAtEndOfFrame();
    };
    return descriptor;
  };
}
