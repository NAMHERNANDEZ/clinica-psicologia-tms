export type ConnectomeMatrix = number[][];

export interface ConnectomeConfig {
  regions: string[];
  matrix: ConnectomeMatrix;
}

const BASE_CONNECTOME: ConnectomeConfig = {
  regions: ['dlpfc_l', 'dlpfc_r', 'm1_l', 'm1_r', 'sma', 'acc', 'insula_l', 'insula_r', 'broca', 'wernicke', 'occipital', 'temporal_l'],
  matrix: [
    // dlpfc_l  dlpfc_r  m1_l     m1_r     sma      acc      insula_l insula_r broca    wernicke occipital temporal_l
    [0.00,     0.65,    0.40,    0.10,    0.35,    0.70,    0.55,    0.10,    0.05,    0.05,    0.02,    0.08],  // dlpfc_l
    [0.65,     0.00,    0.10,    0.40,    0.35,    0.70,    0.10,    0.55,    0.05,    0.05,    0.02,    0.05],  // dlpfc_r
    [0.40,     0.10,    0.00,    0.30,    0.60,    0.15,    0.10,    0.05,    0.05,    0.05,    0.02,    0.05],  // m1_l
    [0.10,     0.40,    0.30,    0.00,    0.60,    0.15,    0.05,    0.10,    0.05,    0.05,    0.02,    0.05],  // m1_r
    [0.35,     0.35,    0.60,    0.60,    0.00,    0.30,    0.10,    0.10,    0.10,    0.10,    0.05,    0.08],  // sma
    [0.70,     0.70,    0.15,    0.15,    0.30,    0.00,    0.60,    0.60,    0.10,    0.10,    0.05,    0.10],  // acc
    [0.55,     0.10,    0.10,    0.05,    0.10,    0.60,    0.00,    0.40,    0.20,    0.10,    0.05,    0.15],  // insula_l
    [0.10,     0.55,    0.05,    0.10,    0.10,    0.60,    0.40,    0.00,    0.10,    0.20,    0.05,    0.10],  // insula_r
    [0.05,     0.05,    0.05,    0.05,    0.10,    0.10,    0.20,    0.10,    0.00,    0.50,    0.02,    0.35],  // broca
    [0.05,     0.05,    0.05,    0.05,    0.10,    0.10,    0.10,    0.20,    0.50,    0.00,    0.10,    0.40],  // wernicke
    [0.02,     0.02,    0.02,    0.02,    0.05,    0.05,    0.05,    0.05,    0.02,    0.10,    0.00,    0.60],  // occipital
    [0.08,     0.05,    0.05,    0.05,    0.08,    0.10,    0.15,    0.10,    0.35,    0.40,    0.60,    0.00],  // temporal_l
  ],
};

export class ConnectomeEngine {
  regions: string[];
  matrix: ConnectomeMatrix;
  private baseMatrix: ConnectomeMatrix;

  constructor(config?: ConnectomeConfig) {
    const cfg = config || BASE_CONNECTOME;
    this.regions = [...cfg.regions];
    this.matrix = cfg.matrix.map(row => [...row]);
    this.baseMatrix = cfg.matrix.map(row => [...row]);
  }

  get size(): number {
    return this.regions.length;
  }

  getIndex(id: string): number {
    return this.regions.indexOf(id);
  }

  getWeight(from: string, to: string): number {
    const i = this.getIndex(from);
    const j = this.getIndex(to);
    if (i < 0 || j < 0) return 0;
    return this.matrix[i][j];
  }

  setWeight(from: string, to: string, value: number): void {
    const i = this.getIndex(from);
    const j = this.getIndex(to);
    if (i < 0 || j < 0) return;
    this.matrix[i][j] = Math.max(0, Math.min(1, value));
  }

  reinforce(fromIdx: number, toIdx: number, rate: number): void {
    if (fromIdx < 0 || toIdx < 0) return;
    this.matrix[fromIdx][toIdx] = Math.min(1, this.matrix[fromIdx][toIdx] + rate);
  }

  decay(rate: number): void {
    for (let i = 0; i < this.matrix.length; i++) {
      for (let j = 0; j < this.matrix[i].length; j++) {
        this.matrix[i][j] *= (1 - rate);
      }
    }
  }

  reset(): void {
    this.matrix = this.baseMatrix.map(row => [...row]);
  }

  serialize(): ConnectomeConfig {
    return {
      regions: [...this.regions],
      matrix: this.matrix.map(row => [...row]),
    };
  }

  static fromSerializable(data: ConnectomeConfig): ConnectomeEngine {
    return new ConnectomeEngine(data);
  }
}
