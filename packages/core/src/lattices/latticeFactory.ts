import { LatticeStrategy } from './types.js';
import { TriangularLattice } from './triangularLattice.js';

export class LatticeFactory {
  static getStrategy(latticeType: string, symmetryGroup: string): LatticeStrategy | null {
    if (latticeType === 'triangular') {
      return new TriangularLattice(symmetryGroup);
    }
    return null;
  }
}
