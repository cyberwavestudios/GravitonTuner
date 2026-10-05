// Audio bridge - convert effects to Web Audio API parameters
// Implements the comprehensive Quadrant→Audio pipeline specification

// CRITICAL: Frequency bounding to keep all audio in safe musical range
function wrapToOctave(f, f_tonic) {
    // Handle invalid inputs - prevent infinite loops
    if (!isFinite(f) || !isFinite(f_tonic) || f_tonic <= 0 || f <= 0) {
        return Math.max(220, f_tonic || 220); // Safe fallback
    }
    
    // Non-iterative approach to avoid potential hang issues
    const ratio = f / f_tonic;
    const k = Math.floor(Math.log2(ratio));
    let g = f / Math.pow(2, k);
    
    // Ensure we're in the target octave [f_tonic, 2*f_tonic)
    if (g < f_tonic) g *= 2;
    if (g >= 2 * f_tonic) g /= 2;
    
    return g;
}

export function toAudioParams(e, vibUser0to100, fc = 220, isInputA = false, inputAFreq = null) {
    // CRITICAL FIX: Bridge mode effects work independently of vibrato slider
    // XY axis should directly control effects strength without slider interference
    const userScale = isInputA ? 0 : 1; // Input A gets no effects, Input B gets full XY control
    
    // Convert effects to actual audio parameters
    let vibDepthCents, flgDepthMs, ringModFreq, ringModDepth, tremoloRate, tremoloDepth;
    
    if (isInputA) {
        // Input A: 5% flanger for minimal sci-fi feel, no vibrato
        vibDepthCents = 0;
        flgDepthMs = 1; // 5% of 20ms max flanger depth - smallest detectable amount
        ringModFreq = 0;
        ringModDepth = 0;
        tremoloRate = 0;
        tremoloDepth = 0;
        console.log(`🔒 Input A anchor: 5% flanger (${flgDepthMs}ms) - minimal sci-fi feel`);
    } else if (e.fx.mode === "clarity") {
        // Input B clarity mode: Vibrato inversely proportional to ET distance, X/Y control flanger
        vibDepthCents = e.fx.vibDepth * 100; // Increased from 20¢ to 100¢ maximum
        flgDepthMs = e.fx.flgDepth * 20; // Increased from 6ms to 20ms maximum
        ringModFreq = 0; // No ring modulation in clarity mode
        ringModDepth = 0;
        tremoloRate = 0; // No tremolo in clarity mode
        tremoloDepth = 0;
        console.log(`🎯 Input B clarity: vib=${(e.fx.vibDepth*100).toFixed(0)}% (${vibDepthCents.toFixed(1)}¢), flg=${(e.fx.flgDepth*100).toFixed(0)}% (${flgDepthMs.toFixed(1)}ms)`);
    } else {
        // Input B dissonance mode: 100% auto effects + X/Y controlled Ring Mod + Tremolo
        vibDepthCents = e.fx.vibDepth * 100; // 100% vibrato (100¢)
        flgDepthMs = e.fx.flgDepth * 20; // 100% flanger (20ms)
        ringModFreq = e.fx.ringModFreq || 0; // X-axis controlled ring modulation frequency
        ringModDepth = e.fx.ringModDepth || 0; // X-axis controlled ring modulation depth
        tremoloRate = e.fx.tremoloRate || 0; // Y-axis controlled tremolo rate
        tremoloDepth = e.fx.tremoloDepth || 0; // Y-axis controlled tremolo depth
        console.log(`🎵 Input B dissonance: AUTO 100% effects (${vibDepthCents}¢ vib, ${flgDepthMs}ms flg), ringMod=${ringModFreq.toFixed(1)}Hz@${(ringModDepth*100).toFixed(0)}%, tremolo=${tremoloRate.toFixed(1)}Hz@${(tremoloDepth*100).toFixed(0)}%`);
    }
    
    // Get waveform and brightness from quadrant and Y axis
    const waveform = getWaveformFromQuadrant(e.quad);
    const brightness = getBrightnessFromY(e.fx?.Y || 0, e.quad);
    const gain = isInputA ? 1.0 : (e.fx?.mode === "detune" ? getDetuneGainFromY(e.fx.Y) : 1.0);
    
    console.log(`🎚️ Audio params: mode=${e.fx?.mode || 'none'}, vib=${vibDepthCents.toFixed(1)}¢, flg=${flgDepthMs.toFixed(2)}ms, ringMod=${ringModFreq.toFixed(1)}Hz@${(ringModDepth*100).toFixed(0)}%, tremolo=${tremoloRate.toFixed(1)}Hz@${(tremoloDepth*100).toFixed(0)}%, waveform=${waveform}`);
    
    // Calculate frequencies: Input A sets the anchor, Input B is relative to Input A
    let fObs, fArch;
    
    if (isInputA) {
        // Input A: Pure resonance anchor - both frequencies identical at ET quantization
        const fAnchor_raw = fc * e.q_et;
        const fAnchor = wrapToOctave(fAnchor_raw, fc);
        fObs = fAnchor;
        fArch = fAnchor;
        console.log(`🔒 Input A anchor: Both frequencies set to ${fAnchor.toFixed(1)}Hz (ET quantized)`);
    } else {
        // Input B: Must be calculated relative to Input A's actual frequency
        if (inputAFreq) {
            // Use provided Input A frequency as reference for Input B's octave
            const fB_raw = fc * e.q_et;
            const fB = wrapToOctave(fB_raw, inputAFreq); // Wrap relative to Input A's frequency
            
            fObs = fB;
            fArch = fB;
            console.log(`🎯 Input B bound: Both frequencies set to ${fB.toFixed(1)}Hz (relative to Input A at ${inputAFreq.toFixed(1)}Hz)`);
        } else {
            // Fallback: calculate without Input A reference (should not happen in Bridge mode)
            const fB_raw = fc * e.q_et;
            const fB = wrapToOctave(fB_raw, fc);
            
            fObs = fB;
            fArch = fB;
            console.log(`⚠️ Input B fallback: Both frequencies set to ${fB.toFixed(1)}Hz (no Input A reference)`);
        }
    }
    
    return {
        // Frequencies (bounded to one octave)
        fObs,
        fArch,
        
        // Effects parameters - Input A gets 20% flanger, Input B gets full effects
        vibDepthCents,
        vibRate: isInputA ? 4.5 : (e.fx?.vibRate || 4.5), // Safe default for Input A
        flgDepthMs,
        flgRate: isInputA ? 0.3 : (e.fx?.flgRate || 0.3), // Safe default for Input A  
        flgFeedback: isInputA ? 0.15 : (e.fx?.flgFeedback || 0), // 15% feedback for Input A flanger
        ringModFreq,
        ringModDepth,
        tremoloRate,
        tremoloDepth,
        
        // Timbre and brightness
        waveform,
        brightness,
        gain,
        
        // Debug info
        quad: e.quad,
        mode: e.fx?.mode || 'none',
        X: e.fx?.X || 0,
        Y: e.fx?.Y || 0
    };
}

// Helper functions for quadrant-based timbres
function getWaveformFromQuadrant(quad) {
    switch(quad) {
        case 'Ⓢ': return 'sine';
        case 'Ⓒ': return 'triangle';
        case 'Ⓦ': return 'sine';
        case 'Ⓐ': return 'sawtooth';
        default: return 'sine';
    }
}

function getBrightnessFromY(Y, quad) {
    const baseFreq = 1000;
    const maxFreq = 8000;
    const brightness = baseFreq + (Y * (maxFreq - baseFreq));
    
    switch(quad) {
        case 'Ⓦ': return brightness * 0.7;
        default: return brightness;
    }
}

function getDetuneGainFromY(Y) {
    return 0.3 + (Y * 0.4);
}