// Wavetable Processor for Cyber Tuning Fork
class WavetableProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        
        // Wavetable data
        this.wavetable = null;
        this.frameSize = 2048;
        this.numFrames = 0;
        
        // Active voices
        this.voices = new Map();
        this.maxVoices = 8;
        
        // Vibrato parameters
        this.vibratoRate = 6.5; // Hz - typical vibrato rate
        this.vibratoDepth = 0; // 0-1, set by user slider
        this.vibratoPhase = 0;
        this.outputGain = 1.0;
        
        // Flanger for shimmer effect
        this.flangerEnabled = true;
        this.flangerPhase = 0;
        this.flangerRate = 0.3; // Hz - slower rate for smoother effect
        this.flangerDepth = 0.002; // 2ms depth
        this.flangerFeedback = 0.3;
        this.flangerMix = 0.2; // 20% wet signal
        
        // Flanger delay buffer
        this.flangerMaxDelay = 0.005; // 5ms max delay
        this.flangerDelayBufferSize = Math.ceil(44100 * this.flangerMaxDelay);
        this.flangerDelayBuffer = new Float32Array(this.flangerDelayBufferSize);
        this.flangerWriteIndex = 0;
        
        // Chorus parameters for stereo width
        this.chorusEnabled = true;
        this.chorusDelay = 0.003; // 3ms
        this.chorusDelayBuffer = new Array(2);
        this.chorusDelayBufferSize = Math.ceil(44100 * this.chorusDelay); // Use fixed sample rate for initialization
        this.chorusWriteIndex = 0;
        
        // Initialize chorus delay buffers
        for (let channel = 0; channel < 2; channel++) {
            this.chorusDelayBuffer[channel] = new Float32Array(this.chorusDelayBufferSize);
        }
        
        // Message handling
        this.port.onmessage = this.handleMessage.bind(this);
    }
    
    handleMessage(event) {
        const { type, data } = event.data;
        
        switch (type) {
            case 'wavetable':
                this.wavetable = data;
                this.numFrames = data.length;
                this.frameSize = data[0].length;
                break;
                
            case 'noteOn':
                this.startVoice(event.data);
                break;
                
            case 'noteOff':
                this.stopVoice(event.data.noteId);
                break;
                
            case 'vibrato':
                this.vibratoDepth = event.data.depth; // 0-1 value
                break;

            case 'gain':
                this.outputGain = Math.max(0, Math.min(1, event.data.level));
                break;
        }
    }
    
    startVoice(params) {
        const { frequency, velocity, noteId } = params;
        
        // Voice management - remove oldest if at limit
        if (this.voices.size >= this.maxVoices) {
            const oldestVoice = this.voices.keys().next().value;
            this.voices.delete(oldestVoice);
        }
        
        // Create new voice
        const voice = {
            frequency: frequency,
            velocity: velocity,
            phase: 0,
            envelope: {
                stage: 'attack',
                value: 0,
                attack: 0.01,   // 10ms
                decay: 0.12,    // 120ms
                sustain: 0.85,  // 85%
                release: 0.3,   // 300ms
                releaseStart: 0
            },
            active: true
        };
        
        this.voices.set(noteId, voice);
    }
    
    stopVoice(noteId) {
        const voice = this.voices.get(noteId);
        if (voice && voice.active) {
            voice.envelope.stage = 'release';
            voice.envelope.releaseStart = voice.envelope.value;
            voice.active = false;
        }
    }
    
    process(inputs, outputs, parameters) {
        const output = outputs[0];
        const blockSize = output[0].length;
        const sampleRate = globalThis.sampleRate || 44100;
        
        // Clear output buffers
        for (let channel = 0; channel < output.length; channel++) {
            output[channel].fill(0);
        }
        
        // Update LFO increments
        const flangerIncrement = (this.flangerRate * Math.PI * 2) / sampleRate;
        const vibratoIncrement = (this.vibratoRate * Math.PI * 2) / sampleRate;
        
        // Mix buffer for flanger processing
        const mixBuffer = new Float32Array(blockSize);
        
        // Process each voice
        for (const [noteId, voice] of this.voices) {
            if (!this.wavetable || this.numFrames === 0) {
                // Use sine wave if no wavetable
                this.processSineVoice(voice, mixBuffer, blockSize, sampleRate);
                continue;
            }
            
            for (let i = 0; i < blockSize; i++) {
                // Apply vibrato to frequency
                const vibratoMod = Math.sin(this.vibratoPhase + (i * vibratoIncrement)) * this.vibratoDepth * 0.05; // 5% max frequency deviation
                const currentFreq = voice.frequency * (1 + vibratoMod);
                
                // Calculate phase increment with vibrato
                const phaseIncrement = (currentFreq * this.frameSize) / sampleRate;
                voice.phase += phaseIncrement;
                
                // Wrap phase
                while (voice.phase >= this.frameSize) {
                    voice.phase -= this.frameSize;
                }
                
                // Get wavetable sample with interpolation
                const sample = this.getWavetableSample(voice.phase);
                
                // Update envelope
                const envValue = this.updateEnvelope(voice.envelope, sampleRate);
                
                // Apply envelope and velocity
                const finalSample = sample * envValue * voice.velocity * 0.3; // Scale down for mixing
                
                // Add to mix buffer
                mixBuffer[i] += finalSample;
            }
            
            // Remove finished voices
            if (voice.envelope.stage === 'finished') {
                this.voices.delete(noteId);
            }
        }
        
        // Apply flanger effect to mixed signal
        for (let i = 0; i < blockSize; i++) {
            // Update flanger LFO phase
            this.flangerPhase += flangerIncrement;
            if (this.flangerPhase > Math.PI * 2) {
                this.flangerPhase -= Math.PI * 2;
            }
            
            // Calculate variable delay time
            const lfoValue = Math.sin(this.flangerPhase);
            const delayTime = this.flangerDepth * (1 + lfoValue) / 2; // 0 to flangerDepth
            const delaySamples = delayTime * sampleRate;
            
            // Get delayed sample with interpolation
            const delayedSample = this.getFlangerSample(delaySamples);
            
            // Mix dry and wet signals
            const drySignal = mixBuffer[i];
            const wetSignal = delayedSample * this.flangerMix;
            const flangedSample = drySignal + wetSignal + (delayedSample * this.flangerFeedback);
            
            // Write to flanger delay buffer
            this.flangerDelayBuffer[this.flangerWriteIndex] = drySignal;
            this.flangerWriteIndex = (this.flangerWriteIndex + 1) % this.flangerDelayBufferSize;
            
            // Output to channels
            output[0][i] += flangedSample;
            
            // Chorus effect for stereo width
            if (this.chorusEnabled && output.length > 1) {
                const chorusDelayed = this.getChorusSample(0);
                output[1][i] += flangedSample * 0.8 + chorusDelayed * 0.2;
                
                // Write to chorus delay buffer
                this.chorusDelayBuffer[0][this.chorusWriteIndex] = flangedSample;
            } else if (output.length > 1) {
                output[1][i] += flangedSample;
            }
        }
        
        // Update LFO phases after processing block
        this.vibratoPhase += vibratoIncrement * blockSize;
        if (this.vibratoPhase > Math.PI * 2) {
            this.vibratoPhase -= Math.PI * 2;
        }
        
        // Update chorus write index
        if (this.chorusEnabled) {
            this.chorusWriteIndex = (this.chorusWriteIndex + blockSize) % this.chorusDelayBufferSize;
        }

        // Apply output gain after all effects so 0% reliably mutes every channel.
        for (let channel = 0; channel < output.length; channel++) {
            for (let i = 0; i < blockSize; i++) {
                output[channel][i] *= this.outputGain;
            }
        }
        
        return true;
    }
    
    getWavetableSample(phase) {
        if (!this.wavetable || this.numFrames === 0) {
            // Fallback to sine wave
            return Math.sin((phase / this.frameSize) * Math.PI * 2);
        }
        
        // Use middle frame for now (could be made dynamic)
        const frameIndex = Math.floor(this.numFrames / 2);
        const frame = this.wavetable[frameIndex];
        
        // Linear interpolation between samples
        const sampleIndex = phase % this.frameSize;
        const index1 = Math.floor(sampleIndex);
        const index2 = (index1 + 1) % this.frameSize;
        const fraction = sampleIndex - index1;
        
        const sample1 = frame[index1] || 0;
        const sample2 = frame[index2] || 0;
        
        return sample1 + (sample2 - sample1) * fraction;
    }
    
    getFlangerSample(delaySamples) {
        const readIndex = this.flangerWriteIndex - delaySamples;
        const index1 = Math.floor(readIndex) % this.flangerDelayBufferSize;
        const index2 = (index1 + 1) % this.flangerDelayBufferSize;
        const fraction = readIndex - Math.floor(readIndex);
        
        if (index1 < 0) {
            return 0;
        }
        
        const sample1 = this.flangerDelayBuffer[index1] || 0;
        const sample2 = this.flangerDelayBuffer[index2] || 0;
        
        return sample1 + (sample2 - sample1) * fraction;
    }
    
    processSineVoice(voice, output, blockSize, sampleRate) {
        for (let i = 0; i < blockSize; i++) {
            // Apply vibrato to frequency
            const vibratoMod = Math.sin(this.vibratoPhase + (i * vibratoIncrement)) * this.vibratoDepth * 0.05; // 5% max frequency deviation
            const currentFreq = voice.frequency * (1 + vibratoMod);
            
            // Calculate phase increment with vibrato
            const phaseIncrement = (currentFreq * this.frameSize) / sampleRate;
            voice.phase += phaseIncrement;
            
            // Wrap phase
            while (voice.phase >= this.frameSize) {
                voice.phase -= this.frameSize;
            }
            
            // Generate sine wave sample
            const sample = Math.sin((voice.phase / this.frameSize) * Math.PI * 2);
            
            // Update envelope
            const envValue = this.updateEnvelope(voice.envelope, sampleRate);
            
            // Apply envelope and velocity
            const finalSample = sample * envValue * voice.velocity * 0.3;
            
            // Add to output buffer
            output[i] += finalSample;
        }
        
        // Remove finished voices
        if (voice.envelope.stage === 'finished') {
            this.voices.delete(voice.noteId);
        }
    }
    
    getChorusSample(channel) {
        const readIndex = (this.chorusWriteIndex - Math.floor(this.chorusDelayBufferSize * 0.8) + this.chorusDelayBufferSize) % this.chorusDelayBufferSize;
        return this.chorusDelayBuffer[channel][readIndex] || 0;
    }
    
    updateEnvelope(envelope, sampleRate) {
        const dt = 1 / sampleRate;
        
        switch (envelope.stage) {
            case 'attack':
                envelope.value += dt / envelope.attack;
                if (envelope.value >= 1) {
                    envelope.value = 1;
                    envelope.stage = 'decay';
                }
                break;
                
            case 'decay':
                const decayTarget = envelope.sustain;
                const decayRate = (1 - decayTarget) / envelope.decay;
                envelope.value -= decayRate * dt;
                if (envelope.value <= decayTarget) {
                    envelope.value = decayTarget;
                    envelope.stage = 'sustain';
                }
                break;
                
            case 'sustain':
                envelope.value = envelope.sustain;
                break;
                
            case 'release':
                const releaseRate = envelope.releaseStart / envelope.release;
                envelope.value -= releaseRate * dt;
                if (envelope.value <= 0) {
                    envelope.value = 0;
                    envelope.stage = 'finished';
                }
                break;
                
            case 'finished':
                envelope.value = 0;
                break;
        }
        
        return Math.max(0, Math.min(1, envelope.value));
    }
}

// Register the processor
registerProcessor('wavetable-processor', WavetableProcessor);
