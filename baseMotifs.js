module.exports = {
  // Square motif
  square: (cellHeight) => [
    { x: 0.0, y: 0.0 },
    { x: 1.0, y: 0.0 },
    { x: 1.0, y: cellHeight },
    { x: 0.0, y: cellHeight }
  ],
  // Chevron base motif
  chevron: (cellHeight) => [
    { x: 0.0, y: 0.0 },                  // Bottom-Left
    { x: 0.5, y: 0.5 },                  // Bottom-Middle (pushed up)
    { x: 1.0, y: 0.0 },                  // Bottom-Right
    { x: 1.0, y: cellHeight },           // Top-Right
    { x: 0.5, y: cellHeight + 0.5 },     // Top-Middle (pushed up)
    { x: 0.0, y: cellHeight }            // Top-Left
  ],

  // Chevron base motif with sharp, deep interlocking features
  chevron2: (cellHeight) => [
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
  sinewave: (cellHeight) => [
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
  squarewave: (cellHeight) => [
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

  // Escher Jigsaw Puzzle Tab (4-way lock)
  puzzle: (cellHeight) => [
    { x: 0.0,   y: 0.0 },
    { x: 0.5,   y: -0.25 },                 // Top interlocking bubble
    { x: 1.0,   y: 0.0 },                   // Top-Right corner
    { x: 1.25,  y: cellHeight * 0.25 },     // Right side out-ward hook start
    { x: 1.45,  y: cellHeight * 0.5 },      // Right side bulb apex
    { x: 1.25,  y: cellHeight * 0.75 },     // Right side hook neck
    { x: 1.0,   y: cellHeight },            // Bottom-Right corner
    { x: 0.5,   y: cellHeight - 0.25 },     // Bottom interlocking bubble cavity
    { x: 0.0,   y: cellHeight },            // Bottom-Left corner anchor point
    { x: 0.25,  y: cellHeight * 0.75 },     // Left side complementary cavity neck
    { x: 0.45,  y: cellHeight * 0.5 },      // Left side cavity apex
    { x: 0.25,  y: cellHeight * 0.25 },     // Left side cavity entry
    { x: 0.0,   y: cellHeight }             // Explicit Bottom-Left path closer for the validator
  ]
};
