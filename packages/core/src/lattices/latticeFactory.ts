import { LatticeStrategy } from './types.ts';
import { TriangularLattice } from './triangularLattice.ts';
import { SquareLattice } from './squareLattice.ts';
import { HexagonalLattice } from './hexagonalLattice.ts';
import { EngineConfig } from '../tessellationEngine.ts';

export class LatticeFactory {
  static getStrategy(
    latticeType: EngineConfig['latticeType'],
    symmetryGroup: EngineConfig['symmetryGroup']
  ): LatticeStrategy {
    switch (latticeType) {
      case 'triangular':
        return new TriangularLattice(symmetryGroup);
      case 'square':
        return new SquareLattice(symmetryGroup);
      case 'hexagonal':
      default:
        return new HexagonalLattice(symmetryGroup);
    }
  }
}
