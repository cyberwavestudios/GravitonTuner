// Effects processing - Comprehensive Quadrant→Audio pipeline
// Implements X/Y axes with 30¢ proximity rule and sophisticated effects

// Base quadrant parameters (used in Clarity mode as starting points)
const BASE = {
    "Ⓢ": { vibDepth: 0.05, vibRate: 5.2, flgDepth: 0.10, flgRate: 0.25, flgFeedback: 0.15 },
    "Ⓒ": { vibDepth: 0.12, vibRate: 5.0, flgDepth: 0.20, flgRate: 0.35, flgFeedback: 0.25 },
    "Ⓦ": { vibDepth: 0.08, vibRate: 4.0, flgDepth: 0.12, flgRate: 0.20, flgFeedback: 0.10 },
    "Ⓐ": { vibDepth: 0.18, vibRate: 5.8, flgDepth: 0.30, flgRate: 0.45, flgFeedback: 0.35 },
};

export function effectsFromDeltaAndQuad(deltaC_et, quad, RM, theta) {
    const proximityThreshold = 30; // Cents threshold for Clarity vs Detune mode
    
    // CRITICAL FIX: Robust Y-axis calculation without division by theta
    // Use safe RM normalization to avoid NaN/Infinity
    const safeRM = (typeof RM === 'number' && isFinite(RM)) ? Math.abs(RM) : 0;
    const maxRM = 10; // Safe constant for normalization
    
    // Calculate X and Y axes for UI control
    const X = Math.min(1, Math.abs(deltaC_et) / 50); // X grows with drift, clip at 1 (0-50¢ range)
    const Y = Math.min(1, safeRM / maxRM); // Y grows with resonance magnitude, safe normalization
    
    // Determine mode based on proximity threshold
    const isClarity = Math.abs(deltaC_et) <= proximityThreshold;
    const mode = isClarity ? "clarity" : "detune";
    
    let vibDepth, vibRate, flgDepth, flgRate, flgFeedback, ringModFreq, ringModDepth, tremoloRate, tremoloDepth;
    
    if (isClarity) {
        // CLARITY MODE (≤30¢): Vibrato inversely proportional to ET distance
        // CORRECTED LOGIC: 100% vibrato when exactly on ET, decreasing to 1% at 30¢ away
        const proximityToET = Math.abs(deltaC_et) / proximityThreshold; // 0 = exactly on ET, 1 = 30¢ away
        vibDepth = Math.max(0.01, 1 - proximityToET); // 100% → 1% as distance increases
        vibRate = 4.5 + (Y * 1.5); // Y controls rate: 4.5-6.0 Hz
        
        // X/Y control flanger in clarity mode
        flgDepth = X; // X controls flanger depth (0-100%)
        flgRate = 0.20 + (Y * 0.30); // Y controls rate: 0.20-0.50 Hz
        flgFeedback = 0.10 + (X * 0.25); // X controls feedback: 0.10-0.35
        
        ringModFreq = 0; // No ring modulation in clarity mode
        ringModDepth = 0;
        tremoloRate = 0; // No tremolo in clarity mode
        tremoloDepth = 0;
        
        console.log(`🎯 Clarity mode: deltaC_et=${Math.abs(deltaC_et).toFixed(1)}¢, proximityToET=${proximityToET.toFixed(2)}, vibDepth=${(vibDepth*100).toFixed(0)}%, flgDepth=${(flgDepth*100).toFixed(0)}%`);
    } else {
        // DETUNE MODE (≥30¢): AUTOMATIC 100% vibrato and flanger effects
        // X/Y axes switch to sharp/flat detuning control (1-100% based on 30-50¢ range)
        
        // FORCE 100% effects when in detune mode (≥30¢ offset)
        vibDepth = 1.0; // 100% vibrato depth
        vibRate = 5.5; // Fixed rate for detune mode
        
        flgDepth = 1.0; // 100% flanger depth
        flgRate = 0.4; // Fixed rate for detune mode
        flgFeedback = 0.5; // Fixed feedback for detune mode
        
        // X/Y switch to Ring Modulation + Tremolo control for extreme dissonance simulation
        const effectRange = Math.min(1, Math.max(0, (Math.abs(deltaC_et) - 30) / 20)); // 0 at 30¢, 1 at 50¢
        
        // X-Axis: Ring Modulation (creates inharmonic sidebands - very dissonant!)
        ringModFreq = 10 + (X * effectRange * 190); // 10-200Hz ring mod frequency
        ringModDepth = X * effectRange; // 0-100% ring mod depth
        
        // Y-Axis: Tremolo (rhythmic amplitude modulation for textural dissonance)
        tremoloRate = 1 + (Y * effectRange * 14); // 1-15Hz tremolo rate  
        tremoloDepth = Y * effectRange * 0.8; // 0-80% tremolo depth
        
        console.log(`🎵 Dissonance mode: offset=${deltaC_et.toFixed(1)}¢, effectRange=${(effectRange*100).toFixed(0)}%, ringMod=${ringModFreq.toFixed(1)}Hz@${(ringModDepth*100).toFixed(0)}%, tremolo=${tremoloRate.toFixed(1)}Hz@${(tremoloDepth*100).toFixed(0)}%`);
    }
    
    return {
        mode,
        X, // Pass X/Y for debugging and brightness control
        Y,
        vibDepth,
        vibRate,
        flgDepth,
        flgRate,
        flgFeedback,
        ringModFreq,
        ringModDepth,
        tremoloRate,
        tremoloDepth,
        proximity: Math.abs(deltaC_et),
        quad // Pass through quadrant for waveform selection
    };
}

// Get waveform type based on quadrant (Ⓢ Ⓒ Ⓦ Ⓐ)
export function getWaveformFromQuadrant(quad) {
    switch(quad) {
        case 'Ⓢ': return 'sine';
        case 'Ⓒ': return 'triangle';
        case 'Ⓦ': return 'sine'; // Lower gain variant
        case 'Ⓐ': return 'sawtooth'; // Or triangle blend
        default: return 'sine';
    }
}

// Get brightness (filter cutoff) based on Y axis and quadrant
export function getBrightnessFromY(Y, quad) {
    const baseFreq = 1000; // Base low-pass frequency
    const maxFreq = 8000; // Maximum frequency
    const brightness = baseFreq + (Y * (maxFreq - baseFreq));
    
    // Quadrant modifications
    switch(quad) {
        case 'Ⓦ': return brightness * 0.7; // Lower brightness for Ⓦ
        default: return brightness;
    }
}

// Get gain scaling based on Y in detune mode (higher Y = clearer/less harsh)
export function getDetuneGainFromY(Y) {
    return 0.3 + (Y * 0.4); // Scale from 0.3 to 0.7 based on Y
}