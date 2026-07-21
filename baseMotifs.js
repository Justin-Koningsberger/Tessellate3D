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
  // Keeps your deep wave depth fixed while adapting the vertical position perfectly
  chevron2: (cellHeight) => [
    { x: 0.0, y: 0.0 },                        // Bottom-Left
    { x: 0.5, y: 0.5 },                        // Bottom-Middle (Pushed up)
    { x: 1.0, y: 0.0 },                        // Bottom-Right
    { x: 1.55, y: cellHeight / 2 },            // Right-Middle Wave (Deep hook)
    { x: 1.0, y: cellHeight },                 // Top-Right
    { x: 0.5, y: cellHeight + 0.5 },           // Top-Middle (Pushed up matching curve)
    { x: 0.0, y: cellHeight },                 // Top-Left
    { x: 0.55, y: cellHeight / 2 }             // Left-Middle Wave (Matching deep pocket)
  ]
};
