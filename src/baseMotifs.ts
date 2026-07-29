import { Point2D } from './tessellationEngine.js';

export const baseMotifs: Record<string, (cellHeight: number) => Point2D[][] | Point2D[]> = {
  // Square motif
  square: (cellHeight: number): Point2D[] => [
    { x: 0.0, y: 0.0 },
    { x: 1.0, y: 0.0 },
    { x: 1.0, y: cellHeight },
    { x: 0.0, y: cellHeight }
  ],

  // Simple square motif with internal Escher-style decorative details
  detailedSquare: (cellHeight: number): Point2D[][] => [
    // The first item is ALWAYS the outer boundary (must pass verifyMotif.js)
    [
      { x: 0.0, y: 0.0 },                   // Top-Left start
      { x: 1.0, y: 0.0 },                   // Top-Right
      { x: 1.0, y: cellHeight },            // Bottom-Right
      { x: 0.0, y: cellHeight },            // Bottom-Left
      { x: 0.0, y: cellHeight }             // Explicit closer for validator
    ],
    // Subsequent items are internal decorations (The Escher "Eye & Scale" Lines)
    [
      { x: 0.2, y: cellHeight * 0.2 },      // Internal Detail A: An "Eye" box
      { x: 0.3, y: cellHeight * 0.2 },
      { x: 0.3, y: cellHeight * 0.3 },
      { x: 0.2, y: cellHeight * 0.3 },
      { x: 0.2, y: cellHeight * 0.2 }       // Close the eye loop
    ],
    [
      { x: 0.4, y: cellHeight * 0.5 },      // Internal Detail B: A decorative curve
      { x: 0.6, y: cellHeight * 0.7 },
      { x: 0.8, y: cellHeight * 0.5 }
    ]
  ],

  // Chevron base motif
  chevron: (cellHeight: number): Point2D[] => [
    { x: 0.0, y: 0.0 },                  // Bottom-Left
    { x: 0.5, y: 0.5 },                  // Bottom-Middle (pushed up)
    { x: 1.0, y: 0.0 },                  // Bottom-Right
    { x: 1.0, y: cellHeight },           // Top-Right
    { x: 0.5, y: cellHeight + 0.5 },     // Top-Middle (pushed up)
    { x: 0.0, y: cellHeight }            // Top-Left
  ],

  // Chevron base motif with sharp, deep interlocking features
  chevron2: (cellHeight: number): Point2D[] => [
    { x: 0.0, y: 0.0 },                   // Top-Left corner start
    { x: 0.5, y: 0.5 },                   // Top-Middle protruding crest (Pushed up)
    { x: 1.0, y: 0.0 },                   // Top-Right corner
    { x: 1.55, y: cellHeight / 2 },       // Right-Middle Wave (Deep hook protrusion)
    { x: 1.0,  y: cellHeight },           // Bottom-Right corner
    { x: 0.5,  y: cellHeight + 0.5 },     // Bottom-Middle matching pocket (Pushed up)
    { x: 0.0,  y: cellHeight },           // Bottom-Left corner
    { x: 0.55, y: cellHeight / 2 },       // Left-Middle Wave (Matching deep pocket receiver)
    { x: 0.0,  y: cellHeight }            // Explicit Bottom-Left path closer
  ],

  // Smooth Sine Wavelet
  sinewave: (cellHeight: number): Point2D[] => [
    { x: 0.0,   y: 0.0 },
    { x: 0.25,  y: -0.2 },                 // Top dip down/up simulation
    { x: 0.75,  y: 0.2 },                  // Crest/peak of the top curve
    { x: 1.0,   y: 0.0 },                  // Top-Right End
    { x: 1.0,   y: cellHeight },           // Drop to Bottom-Right
    { x: 0.75,  y: cellHeight + 0.2 },     // Bottom curve (perfect complement)
    { x: 0.25,  y: cellHeight - 0.2 },     // Trough/dip of the bottom curve
    { x: 0.0,   y: cellHeight },           // Left side cavity entry
    { x: 0.0,   y: cellHeight }            // Explicit Bottom-Left path closer
  ],

  // Castle Battlement / Square Wave Motif
  squarewave: (cellHeight: number): Point2D[] => [
    { x: 0.0,   y: 0.0 },
    { x: 0.4,   y: 0.0 },                   // Narrower base wall
    { x: 0.4,   y: -cellHeight * 0.4 },     // Taller step height
    { x: 0.6,   y: -cellHeight * 0.4 },     // Narrower tooth width
    { x: 0.6,   y: 0.0 },                   // Step down
    { x: 1.0,   y: 0.0 },                   // Top-Right
    { x: 1.0,   y: cellHeight },            // Right edge down
    { x: 0.6,   y: cellHeight },            // Right-side bottom flat wall
    { x: 0.6,   y: cellHeight - cellHeight * 0.4 }, // Matching compact cavity
    { x: 0.4,   y: cellHeight - cellHeight * 0.4 }, // Inside floor of the bottom cavity
    { x: 0.4,   y: cellHeight },            // Corner where cavity steps back down
    { x: 0.0,   y: cellHeight }             // Bottom-Left
  ],

  // Proportioned Jigsaw Puzzle Tab preventing Bijectivity Distortion Faults
  puzzle: (cellHeight: number): Point2D[] => [
    { x: 0.0,   y: 0.0 },
    { x: 0.5,   y: -cellHeight * 0.3 },     // Top bubble scaled to height
    { x: 1.0,   y: 0.0 },                   // Top-Right corner
    { x: 1.0,   y: cellHeight * 0.25 },     // Keep X locked to 1.0 wall
    { x: 1.2,   y: cellHeight * 0.5 },      // Controlled rightward protrusion
    { x: 1.0,   y: cellHeight * 0.75 },     // Right side hook neck return
    { x: 1.0,   y: cellHeight },            // Bottom-Right corner
    { x: 0.5,   y: cellHeight - cellHeight * 0.3 }, // Matching bottom bubble cavity
    { x: 0.0,   y: cellHeight },            // Bottom-Left corner anchor point
    { x: 0.0,   y: cellHeight * 0.75 },     // Keep X locked to 0.0 wall
    { x: 0.2,   y: cellHeight * 0.5 },      // Matching internal left cavity
    { x: 0.0,   y: cellHeight * 0.25 },     // Left side cavity entry
    { x: 0.0,   y: cellHeight }             // Explicit Bottom-Left path closer
  ]
};
