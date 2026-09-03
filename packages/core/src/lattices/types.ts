export interface Point2D {
  x: number;
  y: number;
}

export interface LatticeContext {
  branch: number;
  ring: number;
  totalBranches: number;
  cellHeight: number;
  triWidth: number;
  shearSlope: number;
  variantMode: string;
  useAutoAlignment: boolean;
  sliders: {
    intersection: number;
    distanceMultiplier: number;
    phaseOffset: number;
  };
}

export interface LatticeStrategy {
  getOrientations(): string[];
  transformLocal(pt: Point2D, orientation: string, cellHeight: number): Point2D;
  finalizeGridSpace(gridSpace: Point2D, shearedPoint: Point2D, orientation: string, ctx: LatticeContext): Point2D;
}
