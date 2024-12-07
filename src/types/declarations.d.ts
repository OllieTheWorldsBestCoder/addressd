declare module '@mapbox/vector-tile' {
  export class VectorTile {
    constructor(pbf: any);
    layers: {
      [key: string]: {
        length: number;
        feature(i: number): {
          properties: { [key: string]: any };
          loadGeometry(): Array<Array<{ x: number; y: number }>>;
        };
      };
    };
  }
}

declare module 'pbf' {
  export default class Protobuf {
    constructor(data: ArrayBuffer);
  }
} 