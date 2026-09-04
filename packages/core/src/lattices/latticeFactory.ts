import { LatticeStrategy } from './types.ts';
import { TriangularLattice } from './triangularLattice.ts';
import { SquareLattice } from './squareLattice.ts';

export class LatticeFactory {
  static getStrategy(latticeType: string, symmetryGroup: string): LatticeStrategy | null {
    if (latticeType === 'triangular') {
      return new TriangularLattice(symmetryGroup);
    }
    if (latticeType === 'square') {
      return new SquareLattice(symmetryGroup);
    }
    return null;
  }
}
