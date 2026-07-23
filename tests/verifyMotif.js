const baseMotifs = require('../baseMotifs.js');

function validateMotif(name, func) {
    console.log(`Checking [${name}]...`);
    const testHeight = 0.8; // Simulated cellHeight from spiral engine
    const rawData = func(testHeight);

    // IF it's a multi-path array, grab the first nested array (the outer boundary)
    const points = Array.isArray(rawData[0]) ? rawData[0] : rawData;

    if (!Array.isArray(points) || points.length === 0) {
        console.error(`❌ Error: ${name} did not return a valid array of points.`);
        return false;
    }

    // 1. Verify Array Structure
    for (let i = 0; i < points.length; i++) {
        if (typeof points[i].x !== 'number' || typeof points[i].y !== 'number') {
            console.error(`❌ Error: Point at index ${i} is missing x or y numerical properties.`);
            return false;
        }
    }

    // 2. Identify Boundary Anchors
    const topLeft = points[0];
    const topRight = points.find(p => p.x === 1.0 && (p.y === 0.0 || Math.abs(p.y) < 0.001 || p.y === -testHeight * 0.4)); // Flexible lookup for stepped corners
    const bottomRight = points.find(p => p.x === 1.0 && p.y === testHeight);
    const bottomLeft = points[points.length - 1];

    // 3. Test Structural Integrity
    if (topLeft.x !== 0.0 || topLeft.y !== 0.0) {
        console.error(`❌ Error: Path must start exactly at Top-Left {x: 0, y: 0}. Found:`, topLeft);
        return false;
    }
    if (bottomLeft.x !== 0.0 || Math.abs(bottomLeft.y - testHeight) > 0.001) {
        console.error(`❌ Error: Path must end exactly at Bottom-Left {x: 0, y: cellHeight}. Found:`, bottomLeft);
        return false;
    }

    console.log(`✅ ${name} passed boundary constraints! (${points.length} nodes verified)`);
    return true;
}

// Run validation against all library configurations
console.log("=== STARTING BASE MOTIF VALIDATION ===");
let allPassed = true;

Object.keys(baseMotifs).forEach(key => {
    const success = validateMotif(key, baseMotifs[key]);
    if (!success) allPassed = false;
});

if (allPassed) {
    console.log("\n🚀 All motifs are perfectly synchronized! Safe to commit.");
} else {
    console.log("\n⚠️ Boundary errors found. Fix coordinates before staging.");
}
