export interface PresetElements {
  variantMode: HTMLSelectElement | HTMLInputElement;
  baseMotif: HTMLSelectElement | HTMLInputElement;
  latticeType: HTMLSelectElement | HTMLInputElement;
  symmetryGroup: HTMLSelectElement | HTMLInputElement;
  totalBranches: HTMLInputElement;
  maxRings: HTMLInputElement;
  decayMultiplier: HTMLInputElement;
  twistFactor: HTMLInputElement;
  staggerFactor: HTMLInputElement;
  latticePhaseOffset: HTMLInputElement;
  ringDistanceMultiplier: HTMLInputElement;
  ringIntersectionFactor: HTMLInputElement;
  applyStroke: HTMLInputElement;
  useAutoAlignment: HTMLInputElement;
}

export interface PresetConfig {
  variantMode: string;
  baseMotif: string;
  latticeType: string;
  symmetryGroup: string;
  totalBranches: string;
  maxRings: string;
  decayMultiplier: string;
  twistFactor: string;
  staggerFactor: string;
  latticePhaseOffset: string;
  ringDistanceMultiplier: string;
  ringIntersectionFactor: string;
  applyStroke: boolean;
  useAutoAlignment: boolean;
}

export const VISUAL_PRESETS: Record<string, PresetConfig> = {
  cats: {
    variantMode: 'single-pole',
    baseMotif: 'cat',
    latticeType: 'square',
    symmetryGroup: 'p1',
    useAutoAlignment: true,
    totalBranches: '10',
    maxRings: '5',
    decayMultiplier: '0.54',
    twistFactor: '0.00',
    staggerFactor: '0.0',
    latticePhaseOffset: '1.00',
    ringDistanceMultiplier: '1.00',
    ringIntersectionFactor: '1.00',
    applyStroke: false
  },
  vortex: {
    variantMode: 'loxodromic',
    baseMotif: 'square',
    latticeType: 'square',
    symmetryGroup: 'p1',
    useAutoAlignment: true,
    totalBranches: '4',
    maxRings: '16',
    decayMultiplier: '0.3',
    twistFactor: '1.5',
    staggerFactor: '3.0',
    latticePhaseOffset: '1.00',
    ringDistanceMultiplier: '1.00',
    ringIntersectionFactor: '1.00',
    applyStroke: false
  },
  typography: {
    variantMode: 'none',
    baseMotif: 'letters',
    latticeType: 'square',
    symmetryGroup: 'p1',
    useAutoAlignment: true,
    totalBranches: '6',
    maxRings: '7',
    decayMultiplier: '0.54',
    twistFactor: '0.00',
    staggerFactor: '0.0',
    latticePhaseOffset: '1.00',
    ringDistanceMultiplier: '1.00',
    ringIntersectionFactor: '1.00',
    applyStroke: true
  },
  mandala: {
    variantMode: 'logarithmic',
    baseMotif: 'detailedTriangle',
    latticeType: 'triangular',
    symmetryGroup: 'p1',
    useAutoAlignment: true,
    totalBranches: '10',
    maxRings: '6',
    decayMultiplier: '0.00',
    twistFactor: '0.00',
    staggerFactor: '0.0',
    latticePhaseOffset: '-5.00',
    ringDistanceMultiplier: '0.27',
    ringIntersectionFactor: '0.54',
    applyStroke: false
  },
  cyclone: {
    variantMode: 'loxodromic',
    baseMotif: 'triangle',
    latticeType: 'triangular',
    symmetryGroup: 'p1',
    useAutoAlignment: true,
    totalBranches: '10',
    maxRings: '6',
    decayMultiplier: '1.00',
    twistFactor: '-0.67',
    staggerFactor: '0.0',
    latticePhaseOffset: '-4.00',
    ringDistanceMultiplier: '0.27',
    ringIntersectionFactor: '0.54',
    applyStroke: false
  },
  mitosis: {
    variantMode: 'multi-pole',
    baseMotif: 'triangle',
    latticeType: 'triangular',
    symmetryGroup: 'p1',
    useAutoAlignment: true,
    totalBranches: '20',
    maxRings: '7',
    decayMultiplier: '1.58',
    twistFactor: '0.00',
    staggerFactor: '0.0',
    latticePhaseOffset: '4.00',
    ringDistanceMultiplier: '-1.31',
    ringIntersectionFactor: '0.27',
    applyStroke: false
  },
  snowflakes: {
    variantMode: 'single-pole',
    baseMotif: 'kochSnowflake',
    latticeType: 'hexagonal',
    symmetryGroup: 'p3',
    useAutoAlignment: true,
    totalBranches: '20',
    maxRings: '20',
    decayMultiplier: '1.05',
    twistFactor: '0.0',
    staggerFactor: '0.0',
    latticePhaseOffset: '0.00',
    ringDistanceMultiplier: '0.27',
    ringIntersectionFactor: '0.54',
    applyStroke: false
  },
  lizzards: {
    variantMode: 'loxodromic',
    baseMotif: 'lizard',
    latticeType: 'hexagonal',
    symmetryGroup: 'p3',
    useAutoAlignment: true,
    totalBranches: '6',
    maxRings: '6',
    decayMultiplier: '0.85',
    twistFactor: '-0.37',
    staggerFactor: '0.0',
    latticePhaseOffset: '-3.50',
    ringDistanceMultiplier: '1.27',
    ringIntersectionFactor: '0.54',
    applyStroke: true
  },
  hexPuzzle: {
    variantMode: 'logarithmic',
    baseMotif: 'hexPuzzle',
    latticeType: 'hexagonal',
    symmetryGroup: 'p3',
    useAutoAlignment: false,
    totalBranches: '10',
    maxRings: '14',
    decayMultiplier: '1.00',
    twistFactor: '0.0',
    staggerFactor: '0.0',
    latticePhaseOffset: '3.50',
    ringDistanceMultiplier: '1.3',
    ringIntersectionFactor: '1.21',
    applyStroke: false
  }
};

/**
 * Initializes the preset click listener context on a given container element.
 * Maps data properties directly onto configuration variables.
 */
export function initializePresetListener(
  containerSelector: string,
  els: PresetElements,
  onPresetApplied: () => void
): void {
  const container = document.querySelector(containerSelector);
  if (!container) return;

  container.addEventListener('click', (e: Event) => {
    const target = e.target as HTMLButtonElement;
    if (!target.classList.contains('btn-preset')) return;

    const presetName = target.getAttribute('data-preset');
    if (!presetName || !VISUAL_PRESETS[presetName]) return;

    const config = VISUAL_PRESETS[presetName]!;

    // Reflect configuration properties securely down to bound elements
    els.variantMode.value = config.variantMode;
    els.baseMotif.value = config.baseMotif;
    els.latticeType.value = config.latticeType;
    els.symmetryGroup.value = config.symmetryGroup;
    els.totalBranches.value = config.totalBranches;
    els.maxRings.value = config.maxRings;
    els.decayMultiplier.value = config.decayMultiplier;
    els.twistFactor.value = config.twistFactor;
    els.staggerFactor.value = config.staggerFactor;
    els.latticePhaseOffset.value = config.latticePhaseOffset;
    els.ringDistanceMultiplier.value = config.ringDistanceMultiplier;
    els.ringIntersectionFactor.value = config.ringIntersectionFactor;
    els.applyStroke.checked = config.applyStroke;
    els.useAutoAlignment.checked = config.useAutoAlignment;

    // Trigger calculation updates
    onPresetApplied();
  });
}
