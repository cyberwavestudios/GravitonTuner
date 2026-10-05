// Cyber Tuning Fork - Main Application

class CyberTuningFork {
    constructor() {
        // Core state
        this.audioContext = null;
        this.workletNode = null;
        this.compressor = null;
        this.analyser = null;
        this.wavetable = null;
        this.isRecording = false;
        this.recordingData = [];
        this.recordingStartTime = 0;
        this.activeNotes = new Map();
        
        // Bridge mode state
        this.bridgeMode = false;
        this.bridgeState = {
            tonicIndex: 0,
            inputA: 1,  // Default numeric values to match UI
            inputB: 2,
            evaluatedA: null,
            evaluatedB: null,
            crossResonance: null,
            vibrato: 0,
            isPlaying: false,
            activeIntervals: []
        };
        this.currentTonic = 0; // C = 0
        this.currentMode = 'aeolian';
        this.currentOctave = 2; // Graviton octave - deep frequencies
        this.vibratoAmount = 0; // 0-100 percent
        this.gainAmount = 100; // Output gain, 0-100 percent
        
        // Black hole portal easter egg state
        this.portalActive = false;
        this.portalElement = null;
        
        // Touch smoothing for upper register
        this.lastDetectedDegree = null;
        this.stickiness = 0.05; // Prevents rapid switching between nearby notes
        
        // Constants
        this.NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        this.ZODIAC_SIGNS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
        this.PLANETS = ['⊕', '☽', '☿', '♀', '♂', '♃', '♄', '☉'];
        
        // Scale intervals (semitones from tonic)
        this.SCALES = {
            ionian: [0, 2, 4, 5, 7, 9, 11, 12],
            dorian: [0, 2, 3, 5, 7, 9, 10, 12],
            phrygian: [0, 1, 3, 5, 7, 8, 10, 12],
            lydian: [0, 2, 4, 6, 7, 9, 11, 12],
            mixolydian: [0, 2, 4, 5, 7, 9, 10, 12],
            aeolian: [0, 2, 3, 5, 7, 8, 10, 12],
            locrian: [0, 1, 3, 5, 6, 8, 10, 12]
        };
        
        // Pythagorean ratios for visual positioning
        this.RATIOS = {
            ionian: [1, 9/8, 81/64, 4/3, 3/2, 27/16, 243/128, 2],
            dorian: [1, 9/8, 32/27, 4/3, 3/2, 27/16, 16/9, 2],
            phrygian: [1, 256/243, 32/27, 4/3, 3/2, 128/81, 16/9, 2],
            lydian: [1, 9/8, 81/64, 729/512, 3/2, 27/16, 243/128, 2],
            mixolydian: [1, 9/8, 81/64, 4/3, 3/2, 27/16, 16/9, 2],
            aeolian: [1, 9/8, 32/27, 4/3, 3/2, 128/81, 16/9, 2],
            locrian: [1, 256/243, 32/27, 4/3, 1024/729, 128/81, 16/9, 2]
        };
        
        this.init();
    }
    
    async init() {
        try {
            console.log('🚀 Starting initialization...');
            this.showLoadingSoundAnimation();
            console.log('✅ Loading sound animation started');
            await this.loadAssets();
            console.log('✅ Assets loaded');
            this.loadSettings();
            await this.setupUI();
            console.log('✅ UI setup completed');
            await this.setupAudio();
            console.log('✅ Audio setup completed');
            this.updateDisplay();
            this.setupMobileAudioNotice();
            this.initializeBlackHolePortal();
            this.showStatus('Cyber Tuning Fork loaded successfully', 'success');
        } catch (error) {
            console.error('Initialization error:', error);
            this.showStatus('Error initializing application: ' + error.message, 'error');
        }
    }
    
    showLoadingSoundAnimation() {
        const loadingSound = document.getElementById('loading-sound');
        if (!loadingSound) {
            console.warn('loading-sound element missing; skipping animation');
            return;
        }
        
        // Show the loading animation immediately
        loadingSound.classList.remove('hidden');
        
        // Hide after 5 seconds with smooth transition
        setTimeout(() => {
            loadingSound.classList.add('hidden');
        }, 5000);
    }

    setupMobileAudioNotice() {
        // Detect mobile devices and show audio notice
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            const audioNotice = document.getElementById('audio-notice');
            audioNotice.classList.remove('hidden');
            audioNotice.textContent = '🔊 Tap twice to enable audio';
            
            // Auto-hide after 8 seconds (longer for mobile)
            setTimeout(() => {
                if (!this.audioReady) {
                    audioNotice.style.opacity = '0';
                    setTimeout(() => {
                        audioNotice.classList.add('hidden');
                    }, 300);
                }
            }, 8000);
        }
        
        // Add global activation listeners for all platforms 
        this.setupGlobalAudioActivation();
    }
    
    setupGlobalAudioActivation() {
        const activateAudio = async (e) => {
            // Fire if not yet ready, OR if AudioContext became suspended again after activation
            // (recovery case: double-tapped with sound off, turned sound on, next tap recovers)
            const needsRun = !this.audioReady ||
                (this.audioContext && this.audioContext.state === 'suspended');

            if (needsRun && this.audioContext) {
                await this.ensureAudioReady();
                // Listeners are NOT removed — kept permanent so recovery works at any point
            }
        };

        document.addEventListener('touchstart', activateAudio, { passive: false });
        document.addEventListener('click', activateAudio, { passive: false });
        document.addEventListener('pointerdown', activateAudio, { passive: false });
        document.addEventListener('keydown', activateAudio, { passive: false });
    }

    async ensureAudioReady() {
        // Skip only if already ready AND context is actually running (not suspended)
        if (this.audioReady && this.audioContext && this.audioContext.state === 'running') return;

        try {
            if (this.audioContext.state === 'suspended') {
                console.log('Resuming audio context for mobile...');
                await this.audioContext.resume();

                let retries = 0;
                const maxRetries = 5;
                while (this.audioContext.state === 'suspended' && retries < maxRetries) {
                    console.log(`Audio still suspended, retry ${retries + 1}/${maxRetries}...`);
                    await new Promise(resolve => setTimeout(resolve, 100));
                    await this.audioContext.resume();
                    retries++;
                }

                if (this.audioContext.state === 'suspended') {
                    console.warn('Audio context failed to resume after retries');
                    this.showStatus('Audio activation failed. Please tap again.', 'warning');
                    return;
                }
            }

            if (this.audioContext.state === 'running') {
                // Load the worklet now — service worker is fully settled after user gesture
                await this.setupWorklet();

                // Fully unlock iOS audio with a dummy sound
                const dummyOsc = this.audioContext.createOscillator();
                const dummyGain = this.audioContext.createGain();
                dummyGain.gain.value = 0;
                dummyOsc.connect(dummyGain);
                dummyGain.connect(this.audioContext.destination);
                dummyOsc.start();
                dummyOsc.stop(this.audioContext.currentTime + 0.01);

                this.audioReady = true;
                console.log('Audio engine ready for immediate playback');

                this.enableScaleNodes();

                const audioNotice = document.getElementById('audio-notice');
                if (audioNotice && !audioNotice.classList.contains('hidden')) {
                    audioNotice.style.background = 'rgba(0, 255, 0, 0.9)';
                    audioNotice.textContent = '🔊 Audio Ready!';
                    setTimeout(() => {
                        audioNotice.style.opacity = '0';
                        setTimeout(() => audioNotice.classList.add('hidden'), 300);
                    }, 800);
                }
            }
        } catch (error) {
            console.error('Failed to enable audio:', error);
            this.showStatus('Audio failed to start. Tap anywhere to retry.', 'error');
        }
    }
    
    async loadAssets() {
        // Try to load CyberTuningFork.wav
        try {
            const response = await fetch('CyberTuningFork.wav');
            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                this.wavetableBuffer = arrayBuffer;
            } else {
                throw new Error('WAV file not found');
            }
        } catch (error) {
            console.warn('Could not load CyberTuningFork.wav, using sine fallback:', error);
            this.wavetableBuffer = null;
        }
        
        // Try to load fork image with enhanced reliability for hyperlink access
        console.log('🔧 Starting fork image setup...');
        const forkImage = document.getElementById('fork-image');
        const forkFallback = document.querySelector('.fork-fallback');
        
        if (!forkImage || !forkFallback) {
            console.warn('Fork image or fallback elements missing; skipping image setup');
            return;
        }
        
        // Ensure fallback is visible initially until image loads successfully
        forkFallback.classList.remove('hidden');
        forkImage.classList.add('hidden');
        
        const loadImageRobust = async (retryCount = 0) => {
            try {
                console.log(`🔄 Loading fork image (attempt ${retryCount + 1})...`);
                
                // Use direct image loading with high priority and caching enabled
                return new Promise((resolve, reject) => {
                    // Configure image for optimal loading
                    forkImage.loading = 'eager';
                    forkImage.decoding = 'async';
                    forkImage.fetchPriority = 'high';
                    
                    forkImage.onload = () => {
                        console.log('✅ Fork image loaded successfully');
                        forkImage.classList.remove('hidden');
                        forkFallback.classList.add('hidden');
                        resolve();
                    };
                    
                    forkImage.onerror = () => {
                        reject(new Error('Image load failed'));
                    };
                    
                    // Start loading immediately with modern WebP format (98% smaller!)
                    forkImage.src = 'CyberTuningFork.webp?v=20250912';
                });
                
            } catch (error) {
                console.warn(`Fork image load attempt ${retryCount + 1} failed:`, error);
                
                // Retry once after a brief delay for network issues
                if (retryCount < 1) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                    return loadImageRobust(retryCount + 1);
                }
                
                // Final fallback
                console.warn('Could not load CyberTuningFork.png after retries, using SVG fallback');
                forkImage.classList.add('hidden');
                forkFallback.classList.remove('hidden');
                this.showStatus('Using fallback graphics (network issue)', 'info');
                throw error;
            }
        };
        
        // Start loading with minimal delay to ensure DOM stability
        setTimeout(() => {
            loadImageRobust().catch(() => {
                console.log('🔄 Fork image fallback active');
            });
        }, 50);
    }
    
    async setupUI() {
        console.log('🔧 Setting up UI...');
        this.createZodiacWheel();
        this.updateZodiacWheel(); // Apply default active styling
        this.createScaleNodes();
        this.updateScaleNodeStates(); // Apply initial state (including audio-disabled if audio not ready)
        this.setupEventListeners();
        this.setupVisualizer();
        this.initializeZodiacAnimations();
        console.log('🔍 About to call setupBridgeMode...');
        await this.setupBridgeMode();
        console.log('🔍 setupBridgeMode completed');
        console.log('✅ UI setup complete');
    }
    
    createZodiacWheel() {
        console.log('🌌 Creating zodiac wheel...');
        const segments = document.getElementById('zodiac-segments');
        console.log('Zodiac segments element:', segments);
        if (!segments) {
            console.error('❌ Could not find zodiac-segments element!');
            return;
        }
        segments.innerHTML = '';
        
        // Create all segments in batches using requestAnimationFrame for smooth loading
        const createSegmentBatch = (startIndex, batchSize = 3) => {
            const endIndex = Math.min(startIndex + batchSize, 12);
            
            for (let i = startIndex; i < endIndex; i++) {
                this.createSingleZodiacSegment(segments, i);
            }
            
            if (endIndex < 12) {
                requestAnimationFrame(() => createSegmentBatch(endIndex, batchSize));
            }
        };
        
        // Start creating segments in batches
        requestAnimationFrame(() => createSegmentBatch(0));
    }
    
    createSingleZodiacSegment(segments, i) {
        const angle = (i * 30) - 90; // Start at top (12 o'clock)
        const nextAngle = angle + 30;
        
        // Convert to radians for calculations
        const rad1 = (angle * Math.PI) / 180;
        const rad2 = (nextAngle * Math.PI) / 180;
        
        // Outer and inner radii
        const outerR = 180;
        const innerR = 100;
        
        // Calculate path points
        const x1 = 200 + outerR * Math.cos(rad1);
        const y1 = 200 + outerR * Math.sin(rad1);
        const x2 = 200 + outerR * Math.cos(rad2);
        const y2 = 200 + outerR * Math.sin(rad2);
        const x3 = 200 + innerR * Math.cos(rad2);
        const y3 = 200 + innerR * Math.sin(rad2);
        const x4 = 200 + innerR * Math.cos(rad1);
        const y4 = 200 + innerR * Math.sin(rad1);
        
        const path = `M ${x1},${y1} A ${outerR},${outerR} 0 0,1 ${x2},${y2} L ${x3},${y3} A ${innerR},${innerR} 0 0,0 ${x4},${y4} Z`;
        
        const segment = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        segment.classList.add('zodiac-segment');
        segment.dataset.note = i;
        
        const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', path);
        pathEl.setAttribute('fill', `hsl(${i * 30}, 50%, 20%)`);
        pathEl.setAttribute('stroke', 'rgba(255, 215, 0, 0.3)');
        pathEl.setAttribute('stroke-width', '1');
        
        const textAngle = angle + 15;
        const textRad = (textAngle * Math.PI) / 180;
        const textR = 140;
        const textX = 200 + textR * Math.cos(textRad);
        const textY = 200 + textR * Math.sin(textRad);
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', textX);
        text.setAttribute('y', textY);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'middle');
        text.setAttribute('fill', '#ffd700');
        text.setAttribute('font-size', '16');
        text.setAttribute('font-weight', 'bold');
        text.textContent = `${this.NOTES[i]} ${this.ZODIAC_SIGNS[i]}`;
        
        segment.appendChild(pathEl);
        segment.appendChild(text);
        segments.appendChild(segment);
        
        // Add touch-friendly hit area
        const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        hitArea.setAttribute('d', path);
        hitArea.setAttribute('fill', 'transparent');
        hitArea.setAttribute('stroke', 'transparent');
        hitArea.setAttribute('stroke-width', '20');
        hitArea.style.cursor = 'pointer';
        segment.appendChild(hitArea);
    }
    
    createScaleNodes() {
        console.log('🎼 Creating scale nodes...');
        const nodes = document.getElementById('scale-nodes');
        console.log('Scale nodes element:', nodes);
        if (!nodes) {
            console.error('❌ Could not find scale-nodes element!');
            return;
        }
        nodes.innerHTML = '';
        
        const ratios = this.RATIOS[this.currentMode];
        const nodePositions = [];
        
        // First create the mystical threading pattern
        this.createOctaveThreads(nodes, ratios);
        
        // Create scale nodes in batches for smoother loading
        const createNodeBatch = (startIndex, batchSize = 4) => {
            const endIndex = Math.min(startIndex + batchSize, 8);
            
            for (let i = startIndex; i < endIndex; i++) {
                this.createSingleScaleNode(nodes, i, nodePositions);
            }
            
            if (endIndex < 8) {
                requestAnimationFrame(() => createNodeBatch(endIndex, batchSize));
            }
        };
        
        // Start creating nodes in batches
        requestAnimationFrame(() => createNodeBatch(0));
    }
    
    createSingleScaleNode(nodes, i, nodePositions) {
        const position = i / 7; // Equal spacing from 0 to 1
        const x = 50 + (position * 500); // Map to SVG coordinates
        nodePositions.push({ x, i });
        
        const node = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        node.classList.add('scale-node');
        node.dataset.degree = i;
        
        // Enhanced circle with multiple layers
        const outerGlow = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        outerGlow.classList.add('scale-node-glow');
        outerGlow.setAttribute('cx', x);
        outerGlow.setAttribute('cy', 60);
        outerGlow.setAttribute('r', 28);
        outerGlow.setAttribute('fill', 'none');
        outerGlow.setAttribute('stroke', `hsl(${i * 45}, 80%, 60%)`);
        outerGlow.setAttribute('stroke-width', '2');
        outerGlow.setAttribute('opacity', '0.3');
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.classList.add('scale-node-circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', 60);
        circle.setAttribute('r', 24); // Even larger
        circle.setAttribute('fill', `hsl(${i * 45}, 80%, 60%)`);
        circle.setAttribute('stroke', '#ffd700');
        circle.setAttribute('stroke-width', '3');
        circle.setAttribute('filter', 'drop-shadow(0 0 12px rgba(255, 215, 0, 0.6))');
        
        // Planetary symbol inside circle
        const planetText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        planetText.setAttribute('x', x);
        planetText.setAttribute('y', 67);
        planetText.setAttribute('text-anchor', 'middle');
        planetText.setAttribute('dominant-baseline', 'middle');
        planetText.setAttribute('fill', '#000');
        planetText.setAttribute('font-size', '20');
        planetText.setAttribute('font-weight', 'bold');
        planetText.textContent = this.PLANETS[i];
        
        // Degree number below
        const degreeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        degreeText.setAttribute('x', x);
        degreeText.setAttribute('y', 100);
        degreeText.setAttribute('text-anchor', 'middle');
        degreeText.setAttribute('fill', '#ffd700');
        degreeText.setAttribute('font-size', '14');
        degreeText.setAttribute('font-weight', 'bold');
        degreeText.textContent = `${i + 1}`;
        
        node.appendChild(outerGlow);
        node.appendChild(circle);
        node.appendChild(planetText);
        node.appendChild(degreeText);
        nodes.appendChild(node);
        
        // Even larger touch-friendly hit area
        const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        hitArea.setAttribute('cx', x);
        hitArea.setAttribute('cy', 60);
        hitArea.setAttribute('r', 42); // Bigger hit area
        hitArea.setAttribute('fill', 'transparent');
        hitArea.style.cursor = 'pointer';
        hitArea.style.touchAction = 'none';
        node.appendChild(hitArea);
    }
    
    createOctaveThreads(container, ratios) {
        // Create mystical threading pattern showing "nature of the octave"
        const threadGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        threadGroup.classList.add('octave-threads');
        
        // Calculate node positions
        const positions = [];
        for (let i = 0; i < 8; i++) {
            const position = Math.log2(ratios[i]);
            const x = 50 + (position * 500);
            positions.push({ x, y: 60 });
        }
        
        // Create interconnecting threads in sacred geometry patterns
        
        // Base octave line
        const baseLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        baseLine.setAttribute('x1', positions[0].x);
        baseLine.setAttribute('y1', 60);
        baseLine.setAttribute('x2', positions[7].x);
        baseLine.setAttribute('y2', 60);
        baseLine.setAttribute('stroke', 'rgba(255, 215, 0, 0.2)');
        baseLine.setAttribute('stroke-width', '2');
        baseLine.setAttribute('stroke-dasharray', '5,5');
        threadGroup.appendChild(baseLine);
        
        // Fibonacci spiral threading
        for (let i = 0; i < 7; i++) {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const controlY = 60 + Math.sin(i * Math.PI / 4) * 25;
            const d = `M ${positions[i].x} ${positions[i].y} Q ${(positions[i].x + positions[i + 1].x) / 2} ${controlY} ${positions[i + 1].x} ${positions[i + 1].y}`;
            path.setAttribute('d', d);
            path.setAttribute('stroke', `hsl(${i * 51}, 70%, 50%)`);
            path.setAttribute('stroke-width', '1.5');
            path.setAttribute('fill', 'none');
            path.setAttribute('opacity', '0.4');
            threadGroup.appendChild(path);
        }
        
        // Sacred geometry connections (golden ratio relationships)
        const goldenConnections = [
            [0, 2], [1, 3], [2, 5], [3, 6], [5, 7], // Fifth relationships
            [0, 4], [1, 5], [2, 6], [3, 7]         // Octave relationships
        ];
        
        goldenConnections.forEach(([i, j], idx) => {
            if (i < positions.length && j < positions.length) {
                const thread = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                const midY = 60 + (idx % 2 === 0 ? -15 : 15);
                const d = `M ${positions[i].x} ${positions[i].y} Q ${(positions[i].x + positions[j].x) / 2} ${midY} ${positions[j].x} ${positions[j].y}`;
                thread.setAttribute('d', d);
                thread.setAttribute('stroke', 'rgba(255, 215, 0, 0.15)');
                thread.setAttribute('stroke-width', '1');
                thread.setAttribute('fill', 'none');
                thread.setAttribute('stroke-dasharray', '3,3');
                threadGroup.appendChild(thread);
            }
        });
        
        container.appendChild(threadGroup);
    }
    
    setupEventListeners() {
        // Zodiac wheel and scale nodes
        document.addEventListener('pointerdown', this.handlePointerDown.bind(this), { passive: false });
        document.addEventListener('pointermove', this.handlePointerMove.bind(this), { passive: false });
        document.addEventListener('pointerup', this.handlePointerUp.bind(this), { passive: false });
        document.addEventListener('pointercancel', this.handlePointerCancel.bind(this), { passive: false });
        
        // Controls with touch support
        const modeSelect = this.ensureModeSelector();
        if (modeSelect) {
            modeSelect.addEventListener('change', (event) => this.setMode(event.target.value));
        }
        this.setupControlButton('octave-down', () => this.changeOctave(-1));
        this.setupControlButton('octave-up', () => this.changeOctave(1));
        this.setupControlButton('record-button', this.startRecording.bind(this));
        this.setupControlButton('stop-button', this.stopRecording.bind(this));
        this.setupControlButton('export-midi', this.exportMIDI.bind(this));
        
        // Setup vibrato slider
        this.setupVibratoSlider();

        // Setup mobile side sliders (zodiac flanking sliders)
        this.setupMobileSliders();
        
        // Page visibility and blur
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        window.addEventListener('blur', this.stopAllNotes.bind(this));
        
        // Enhanced touch behaviors with haptic feedback
        document.addEventListener('touchstart', (e) => {
            if (e.target.closest('.zodiac-segment') || e.target.closest('.scale-node') || e.target.closest('.control-button')) {
                e.preventDefault();
                // Haptic feedback on supported devices
                if (navigator.vibrate) {
                    navigator.vibrate(10);
                }
            }
        }, { passive: false });
        document.addEventListener('touchmove', (e) => {
            if (e.target.closest('.scale-bar') || this.isDragging) {
                e.preventDefault();
            }
        }, { passive: false });
    }

    ensureModeSelector() {
        let modeSelect = document.getElementById('mode-select');
        if (modeSelect) {
            modeSelect.value = this.currentMode;
            return modeSelect;
        }

        // Upgrade stale iOS/PWA markup that still contains the old Major/Minor button.
        const legacyButton = document.getElementById('mode-toggle');
        if (!legacyButton) return null;

        const picker = document.createElement('label');
        picker.className = 'mode-picker';
        picker.setAttribute('aria-label', 'Musical mode');

        modeSelect = document.createElement('select');
        modeSelect.id = 'mode-select';
        modeSelect.className = 'mode-select';
        modeSelect.setAttribute('aria-label', 'Musical mode');
        modeSelect.style.cssText = [
            'width:clamp(92px,27vw,118px)',
            'min-height:44px',
            'padding:6px 20px 6px 7px',
            'border:2px solid #ffd700',
            'border-radius:6px',
            'background:#1a1a24',
            'color:#ffd700',
            'font-size:10px',
            'font-weight:bold',
            'text-transform:uppercase',
            'touch-action:manipulation'
        ].join(';');

        const modes = ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'];
        modes.forEach((mode) => {
            const option = document.createElement('option');
            option.value = mode;
            option.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
            modeSelect.appendChild(option);
        });

        modeSelect.value = this.currentMode;
        picker.appendChild(modeSelect);
        legacyButton.replaceWith(picker);
        return modeSelect;
    }
    
    setupControlButton(elementId, handler) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        // Add multiple event types for maximum compatibility
        element.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log(`Button clicked: ${elementId}`);
            handler();
        });
        
        element.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log(`Button touched: ${elementId}`);
            handler();
        });
        
        // Visual feedback
        element.addEventListener('touchstart', (e) => {
            e.preventDefault();
            element.style.transform = 'scale(0.95)';
        });
        
        element.addEventListener('touchend', (e) => {
            setTimeout(() => {
                element.style.transform = 'scale(1)';
            }, 100);
        });
        
        element.addEventListener('touchcancel', (e) => {
            element.style.transform = 'scale(1)';
        });
    }
    
    setupVisualizer() {
        this.canvas = document.getElementById('visualizer-canvas');
        this.canvasCtx = this.canvas.getContext('2d');
        this.canvas.width = 140;
        this.canvas.height = 140;
        
        // Animation loop
        this.visualizerActive = false;
        this.animateVisualizer();
        
        // Initialize haptic feedback system
        this.initializeHaptics();
    }
    
    initializeHaptics() {
        // Check if the Vibration API is supported (works on iOS Safari)
        this.hapticSupported = 'vibrate' in navigator;
        this.hapticReady = false;
        
        if (this.hapticSupported) {
            console.log('Haptic API detected - will activate on first user interaction');
        } else {
            console.log('Haptic feedback not supported on this device');
        }
        
        // Stronger haptic patterns for iOS (iOS needs longer durations)
        this.hapticPatterns = {
            singleNote: [50],                    // Stronger buzz for single note
            slideNote: [30],                     // More noticeable slide feedback
            chord: [70, 30, 50],                 // Pronounced chord pattern
            longChord: [80, 40, 60, 40, 70],     // Extended pattern for complex chords
            test: [100, 100, 100]                // Test pattern to verify functionality
        };
    }
    
    triggerHaptic(patternName, intensity = 1.0) {
        if (!this.hapticSupported) {
            console.log('Haptic not supported, skipping vibration');
            return;
        }
        
        let pattern = this.hapticPatterns[patternName];
        if (!pattern) {
            console.warn('Unknown haptic pattern:', patternName);
            return;
        }
        
        // Scale pattern by intensity
        if (intensity !== 1.0) {
            pattern = pattern.map(duration => Math.round(duration * intensity));
        }
        
        // Trigger vibration with enhanced logging
        try {
            console.log(`Triggering haptic: ${patternName}, pattern: [${pattern.join(', ')}]`);
            const result = navigator.vibrate(pattern);
            console.log('Vibration result:', result);
            
            if (!this.hapticReady) {
                this.hapticReady = true;
                console.log('Haptic feedback system now active');
            }
        } catch (error) {
            console.error('Haptic feedback failed:', error);
        }
    }
    
    animateVisualizer() {
        if (this.visualizerActive && this.analyser) {
            const bufferLength = this.analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            this.analyser.getByteFrequencyData(dataArray);
            
            // Calculate average amplitude
            const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
            const normalizedAmplitude = average / 255;
            
            // Clear canvas
            this.canvasCtx.clearRect(0, 0, 140, 140);
            
            if (normalizedAmplitude > 0.01) {
                // Draw black hole effect
                const centerX = 70;
                const centerY = 70;
                const maxRadius = 60;
                
                // Create gradient
                const gradient = this.canvasCtx.createRadialGradient(
                    centerX, centerY, 0,
                    centerX, centerY, maxRadius
                );
                
                const intensity = normalizedAmplitude * 0.9;
                const pulsePhase = Math.sin(Date.now() * 0.008) * 0.1 + 1;
                
                // Outer event horizon
                gradient.addColorStop(0, `rgba(10, 5, 25, ${1 - intensity * 0.7})`);
                gradient.addColorStop(0.2, `rgba(50, 25, 100, ${intensity * 0.4})`);
                gradient.addColorStop(0.5, `rgba(255, 215, 0, ${intensity * 0.6})`);
                gradient.addColorStop(0.8, `rgba(255, 100, 50, ${intensity * 0.3})`);
                gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                
                // Draw the effect with pulsing
                this.canvasCtx.fillStyle = gradient;
                this.canvasCtx.beginPath();
                this.canvasCtx.arc(centerX, centerY, maxRadius * normalizedAmplitude * pulsePhase, 0, Math.PI * 2);
                this.canvasCtx.fill();
                
                // Add gravitational lensing rings
                for (let ring = 1; ring <= 3; ring++) {
                    this.canvasCtx.strokeStyle = `rgba(255, 215, 0, ${intensity * 0.2 / ring})`;
                    this.canvasCtx.lineWidth = 2 / ring;
                    this.canvasCtx.beginPath();
                    const ringRadius = maxRadius * normalizedAmplitude * (0.3 + ring * 0.2) * pulsePhase;
                    this.canvasCtx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
                    this.canvasCtx.stroke();
                }
                
                // Add enhanced swirl effect with multiple layers
                for (let layer = 0; layer < 3; layer++) {
                    this.canvasCtx.strokeStyle = `rgba(255, ${215 - layer * 50}, ${layer * 85}, ${intensity * (1 - layer * 0.2)})`;
                    this.canvasCtx.lineWidth = 3 - layer;
                    this.canvasCtx.beginPath();
                    const spiralRadius = maxRadius * normalizedAmplitude * (0.8 - layer * 0.15);
                    const spiralTurns = 4 + layer;
                    const offset = layer * Math.PI / 3;
                    
                    for (let i = 0; i <= 120; i++) {
                        const angle = (i / 120) * spiralTurns * Math.PI * 2 + offset;
                        const radius = (i / 120) * spiralRadius;
                        const x = centerX + radius * Math.cos(angle);
                        const y = centerY + radius * Math.sin(angle);
                        if (i === 0) {
                            this.canvasCtx.moveTo(x, y);
                        } else {
                            this.canvasCtx.lineTo(x, y);
                        }
                    }
                    this.canvasCtx.stroke();
                }
                
                // Add pulsing core
                const coreRadius = 8 + Math.sin(Date.now() * 0.005) * 3;
                const coreGradient = this.canvasCtx.createRadialGradient(
                    centerX, centerY, 0,
                    centerX, centerY, coreRadius
                );
                coreGradient.addColorStop(0, `rgba(255, 255, 255, ${intensity})`);
                coreGradient.addColorStop(0.7, `rgba(255, 215, 0, ${intensity * 0.6})`);
                coreGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                
                this.canvasCtx.fillStyle = coreGradient;
                this.canvasCtx.beginPath();
                this.canvasCtx.arc(centerX, centerY, coreRadius, 0, Math.PI * 2);
                this.canvasCtx.fill();
            }
        }
        
        requestAnimationFrame(() => this.animateVisualizer());
    }
    
    async setupAudio() {
        try {
            // Create context only — do NOT load the worklet here.
            // The worklet addModule() fetch is deferred to the first user gesture so the
            // service worker's skipWaiting/clients.claim() cannot interrupt it mid-load.
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.audioReady = false;
            this.workletLoaded = false;

            // Set up analyser for visualiser (doesn't need worklet)
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.analyser.smoothingTimeConstant = 0.8;

            console.log('Audio engine ready, waiting for user interaction');

        } catch (error) {
            console.error('Audio setup error:', error);
            this.showStatus('Audio initialization failed: ' + error.message, 'error');
        }
    }

    async setupWorklet() {
        // Called on first user gesture — safely after service worker is fully settled.
        if (this.workletLoaded) return;
        try {
            await this.audioContext.audioWorklet.addModule('worklet-wt.js?v=20250929-audio-v10');

            this.workletNode = new AudioWorkletNode(this.audioContext, 'wavetable-processor');
            this.workletNode.port.postMessage({
                type: 'gain',
                level: this.gainAmount / 100
            });

            this.compressor = this.audioContext.createDynamicsCompressor();
            this.compressor.threshold.value = -24;
            this.compressor.knee.value = 30;
            this.compressor.ratio.value = 12;
            this.compressor.attack.value = 0.003;
            this.compressor.release.value = 0.25;

            this.workletNode.connect(this.compressor);
            this.compressor.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);

            await this.processWavetable();

            this.workletLoaded = true;
            console.log('Worklet loaded and audio chain connected');
        } catch (error) {
            console.error('Worklet setup error:', error);
            throw error;
        }
    }
    
    async processWavetable() {
        if (this.wavetableBuffer && this.audioContext) {
            try {
                const audioBuffer = await this.audioContext.decodeAudioData(this.wavetableBuffer.slice());
                const channelData = audioBuffer.getChannelData(0);
                
                // Optimized processing for mobile
                const frameSize = 2048;
                const numFrames = Math.floor(channelData.length / frameSize);
                const wavetable = [];
                
                // Process in smaller chunks to avoid blocking
                for (let i = 0; i < numFrames; i++) {
                    const frame = new Float32Array(frameSize);
                    const startIdx = i * frameSize;
                    
                    // Use set() for faster copying
                    const sourceSlice = channelData.slice(startIdx, startIdx + frameSize);
                    frame.set(sourceSlice);
                    
                    // Faster normalization
                    let maxVal = 0;
                    for (let j = 0; j < frameSize; j++) {
                        const abs = Math.abs(frame[j]);
                        if (abs > maxVal) maxVal = abs;
                    }
                    
                    if (maxVal > 0) {
                        const scale = 1 / maxVal;
                        for (let j = 0; j < frameSize; j++) {
                            frame[j] *= scale;
                        }
                    }
                    
                    wavetable.push(frame);
                    
                    // Yield control every 10 frames on mobile
                    if (i % 10 === 0 && typeof window !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent)) {
                        await new Promise(resolve => setTimeout(resolve, 0));
                    }
                }
                
                // Send wavetable to worklet
                this.workletNode.port.postMessage({
                    type: 'wavetable',
                    data: wavetable
                });
                
                console.log(`Loaded wavetable with ${numFrames} frames`);
                
            } catch (error) {
                console.error('Wavetable processing error:', error);
                this.createFallbackWavetable();
            }
        } else {
            this.createFallbackWavetable();
        }
    }
    
    createFallbackWavetable() {
        // Create basic sine wave wavetable
        const frameSize = 2048;
        const sineWave = new Float32Array(frameSize);
        
        for (let i = 0; i < frameSize; i++) {
            sineWave[i] = Math.sin((i / frameSize) * Math.PI * 2);
        }
        
        this.workletNode.port.postMessage({
            type: 'wavetable',
            data: [sineWave]
        });
        
        console.log('Using fallback sine wavetable');
    }
    
    async handlePointerDown(e) {
        const scaleNode = e.target.closest('.scale-node');
        
        // Block scale node interactions if audio isn't ready
        if (scaleNode && !this.audioReady) {
            e.preventDefault();
            this.showAudioNotReadyMessage();
            return;
        }
        
        // Ensure audio is ready on ANY first interaction
        if (this.audioContext && !this.audioReady) {
            await this.ensureAudioReady();
        }
        
        // Test haptic feedback on first interaction to ensure it works
        if (this.hapticSupported && !this.hapticReady && !scaleNode) {
            console.log('Testing haptic feedback on first interaction...');
            this.triggerHaptic('test');
        }
        
        const target = e.target.closest('.zodiac-segment');
        if (target) {
            e.preventDefault();
            const noteIndex = parseInt(target.dataset.note);
            this.setTonic(noteIndex);
            return;
        }
        
        if (scaleNode) {
            e.preventDefault();
            const degree = parseInt(scaleNode.dataset.degree);
            console.log(`Scale node touched: degree ${degree}`);
            
            // Initialize touch smoothing
            this.lastDetectedDegree = degree;
            
            // Immediate haptic feedback on touch (before audio processing)
            if (this.hapticSupported) {
                console.log('Triggering immediate haptic for scale node touch');
                this.triggerHaptic('singleNote');
            }
            
            this.playNote(degree, e.pointerId);
            this.draggedPointerId = e.pointerId;
            this.isDragging = true;
            return;
        }
    }
    
    handlePointerMove(e) {
        if (!this.isDragging || e.pointerId !== this.draggedPointerId) return;
        
        e.preventDefault();
        
        const scaleBar = document.querySelector('.scale-bar');
        const rect = scaleBar.getBoundingClientRect();
        const relativeX = (e.clientX - rect.left) / rect.width;
        const clampedX = Math.max(0, Math.min(1, relativeX));
        
        // Find nearest node using EQUAL SPACING to match visual button positions
        let nearestDegree = 0;
        let minDistance = Infinity;
        
        // Calculate equal positions that match the visual button spacing
        // This matches the createSingleScaleNode() equal spacing: position = i / 7
        const equalPositions = [];
        for (let i = 0; i < 8; i++) {
            equalPositions[i] = i / 7; // Equal spacing from 0 to 1, matching visual layout
        }
        
        // Find nearest degree with equal spacing (no logarithmic mapping)
        for (let i = 0; i < 8; i++) {
            let distance = Math.abs(clampedX - equalPositions[i]);
            
            // Apply stickiness to ALL notes to prevent accidental sliding
            if (this.lastDetectedDegree !== null) {
                // Make the currently held note "stickier" to prevent accidental changes
                if (i === this.lastDetectedDegree) {
                    distance -= this.stickiness * 1.5; // Extra stickiness for current note
                }
            }
            
            if (distance < minDistance) {
                minDistance = distance;
                nearestDegree = i;
            }
        }
        
        // Enhanced smoothing: require minimum movement for ALL notes to prevent accidental sliding
        if (this.lastDetectedDegree !== null && nearestDegree !== this.lastDetectedDegree) {
            const minChangeThreshold = 0.06; // Increased threshold for all notes
            if (Math.abs(clampedX - equalPositions[this.lastDetectedDegree]) < minChangeThreshold) {
                nearestDegree = this.lastDetectedDegree; // Stay on current note
            }
        }
        
        // Update last detected degree
        this.lastDetectedDegree = nearestDegree;
        
        // Check if we need to change note
        const currentNote = this.activeNotes.get(e.pointerId);
        if (!currentNote || currentNote.degree !== nearestDegree) {
            if (currentNote) {
                this.stopNote(currentNote.degree, e.pointerId);
                // Haptic feedback for sliding between notes
                this.triggerHaptic('slideNote');
            }
            this.playNote(nearestDegree, e.pointerId);
        }
    }
    
    handlePointerUp(e) {
        this.handlePointerEnd(e);
    }
    
    handlePointerCancel(e) {
        this.handlePointerEnd(e);
    }
    
    handlePointerEnd(e) {
        if (this.draggedPointerId === e.pointerId) {
            this.isDragging = false;
            this.draggedPointerId = null;
            this.lastDetectedDegree = null; // Reset smoothing when touch ends
        }
        
        const activeNote = this.activeNotes.get(e.pointerId);
        if (activeNote) {
            this.stopNote(activeNote.degree, e.pointerId);
        }
    }
    
    setTonic(noteIndex) {
        this.currentTonic = noteIndex;
        this.triggerTonicChangeAnimation();
        this.updateDisplay();
        this.updateZodiacWheel();
    }
    
    setMode(mode) {
        if (!this.SCALES[mode]) return;
        this.stopAllNotes();
        this.currentMode = mode;
        this.updateDisplay();
        this.createScaleNodes(); // Recreate nodes with new positions
        this.saveSettings();
    }
    
    changeOctave(direction) {
        console.log(`Changing octave by ${direction}, current: ${this.currentOctave}`);
        const newOctave = this.currentOctave + direction;
        if (newOctave >= 0 && newOctave <= 8) {
            this.currentOctave = newOctave;
            console.log(`New octave: ${this.currentOctave}`);
            this.updateDisplay();
            this.updateScaleNodeStates();
        } else {
            console.log(`Octave ${newOctave} out of range`);
        }
    }
    
    updateScaleNodeStates() {
        for (let degree = 0; degree < 8; degree++) {
            const semitoneOffset = this.SCALES[this.currentMode][degree];
            const midiNote = 60 + this.currentTonic + semitoneOffset + ((this.currentOctave - 4) * 12);
            const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
            
            const node = document.querySelector(`[data-degree="${degree}"]`);
            if (node) {
                if (frequency < 20 || frequency > 18000) {
                    node.classList.add('dimmed');
                } else {
                    node.classList.remove('dimmed');
                }
            }
        }
    }
    
    playNote(degree, pointerId = 'default') {
        // Don't play if audio isn't ready yet
        if (!this.audioReady) {
            console.log('Audio not ready, note skipped');
            return;
        }
        
        const semitoneOffset = this.SCALES[this.currentMode][degree];
        const midiNote = 60 + this.currentTonic + semitoneOffset + ((this.currentOctave - 4) * 12);
        const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
        
        console.log(`Playing note: degree=${degree}, midiNote=${midiNote}, freq=${frequency.toFixed(2)}Hz`);
        
        // Check frequency range
        if (frequency < 20 || frequency > 18000) {
            console.log('Note out of range, not playing');
            return; // Don't play out-of-range notes
        }
        
        // Stop any existing note for this pointer
        const existingNote = this.activeNotes.get(pointerId);
        if (existingNote) {
            this.stopNote(existingNote.degree, pointerId);
        }
        
        // Send note on to worklet
        if (this.workletNode && this.workletNode.port) {
            this.workletNode.port.postMessage({
                type: 'noteOn',
                frequency: frequency,
                velocity: 0.7,
                noteId: pointerId
            });
            console.log('Sent noteOn to worklet');
        } else {
            console.error('Worklet not available');
        }
        
        // Track active note with degree information
        this.activeNotes.set(pointerId, { degree, midiNote, frequency });
        
        // Check for black hole portal conditions
        this.checkForOctavePortal();
        
        // Additional haptic feedback for note playing (in case the touch one didn't fire)
        if (this.hapticSupported) {
            console.log('Triggering note haptic feedback');
            this.triggerNoteHaptic(pointerId);
        }
        
        // Visual feedback
        const node = document.querySelector(`[data-degree="${degree}"]`);
        if (node) {
            node.classList.add('playing');
            console.log('Added playing class to node');
        }
        
        // Start visualizer
        if (!this.visualizerActive) {
            this.visualizerActive = true;
            this.canvas.classList.add('active');
            const forkVizCircle = document.querySelector('.fork-viz-circle');
            if (forkVizCircle) {
                forkVizCircle.classList.add('active');
            }
        }
        
        // Record if recording
        if (this.isRecording) {
            this.recordingData.push({
                timeMs: Date.now() - this.recordingStartTime,
                type: 'on',
                midiNote: midiNote,
                velocity: 0.7
            });
        }
    }
    
    stopNote(degree, pointerId = 'default') {
        const activeNote = this.activeNotes.get(pointerId);
        if (!activeNote) return;
        
        // Send note off to worklet
        this.workletNode.port.postMessage({
            type: 'noteOff',
            noteId: pointerId
        });
        
        // Remove from active notes
        this.activeNotes.delete(pointerId);
        
        // Visual feedback
        const node = document.querySelector(`[data-degree="${degree}"]`);
        if (node) {
            node.classList.remove('playing');
        }
        
        // Check if portal should close after note stops
        this.checkForOctavePortal();
        
        // Stop visualizer if no notes playing
        if (this.activeNotes.size === 0) {
            this.visualizerActive = false;
            this.canvas.classList.remove('active');
            document.querySelector('.fork-viz-circle').classList.remove('active');
        }
        
        // Record if recording
        if (this.isRecording && activeNote) {
            this.recordingData.push({
                timeMs: Date.now() - this.recordingStartTime,
                type: 'off',
                midiNote: activeNote.midiNote,
                velocity: 0
            });
        }
    }
    
    stopAllNotes() {
        for (const [pointerId, note] of this.activeNotes) {
            this.stopNote(note.degree, pointerId);
        }
    }
    
    startRecording() {
        if (this.isRecording) return;
        
        this.isRecording = true;
        this.recordingData = [];
        this.recordingStartTime = Date.now();
        
        const recordButton = document.getElementById('record-button');
        const stopButton = document.getElementById('stop-button');
        
        recordButton.classList.add('recording');
        recordButton.textContent = 'REC';
        stopButton.disabled = false;
        
        this.showStatus('Recording started', 'info');
    }
    
    stopRecording() {
        if (!this.isRecording) return;
        
        this.isRecording = false;
        this.stopAllNotes();
        
        const recordButton = document.getElementById('record-button');
        const stopButton = document.getElementById('stop-button');
        const exportMidi = document.getElementById('export-midi');
        
        recordButton.classList.remove('recording');
        stopButton.disabled = true;
        exportMidi.disabled = false;
        
        this.showStatus(`Recording stopped (${this.recordingData.length} events)`, 'success');
    }
    
    exportMIDI() {
        if (!this.recordingData.length) return;
        
        try {
            const midiData = this.createMIDIFile();
            const blob = new Blob([midiData], { type: 'audio/midi' });
            this.downloadFile(blob, 'cyber-tuning-fork.mid');
            
            this.showStatus('MIDI exported successfully', 'success');
            
        } catch (error) {
            console.error('MIDI export error:', error);
            this.showStatus('MIDI export failed: ' + error.message, 'error');
        }
    }
    
    createMIDIFile() {
        // Simple MIDI file format
        const tracks = [];
        
        // Sort events by time
        const sortedEvents = [...this.recordingData].sort((a, b) => a.timeMs - b.timeMs);
        
        // Convert to MIDI events
        let lastTime = 0;
        const midiEvents = [];
        
        for (const event of sortedEvents) {
            const deltaTime = Math.max(0, event.timeMs - lastTime);
            lastTime = event.timeMs;
            
            if (event.type === 'on') {
                midiEvents.push({
                    deltaTime: deltaTime,
                    type: 0x90,
                    note: event.midiNote,
                    velocity: Math.round(event.velocity * 127)
                });
            } else {
                midiEvents.push({
                    deltaTime: deltaTime,
                    type: 0x80,
                    note: event.midiNote,
                    velocity: 0
                });
            }
        }
        
        // Build MIDI file
        const header = new Uint8Array([
            0x4D, 0x54, 0x68, 0x64, // "MThd"
            0x00, 0x00, 0x00, 0x06, // Header length
            0x00, 0x00, // Format type 0
            0x00, 0x01, // Number of tracks
            0x00, 0x60  // Ticks per quarter note (96)
        ]);
        
        // Build track
        const trackEvents = [];
        
        // Set tempo (120 BPM)
        trackEvents.push(0x00, 0xFF, 0x51, 0x03, 0x07, 0xA1, 0x20);
        
        // Add MIDI events
        for (const event of midiEvents) {
            const deltaBytes = this.encodeVariableLength(Math.round(event.deltaTime * 96 / 500));
            trackEvents.push(...deltaBytes);
            trackEvents.push(event.type, event.note, event.velocity);
        }
        
        // End of track
        trackEvents.push(0x00, 0xFF, 0x2F, 0x00);
        
        const trackHeader = new Uint8Array([
            0x4D, 0x54, 0x72, 0x6B, // "MTrk"
            (trackEvents.length >> 24) & 0xFF,
            (trackEvents.length >> 16) & 0xFF,
            (trackEvents.length >> 8) & 0xFF,
            trackEvents.length & 0xFF
        ]);
        
        const result = new Uint8Array(header.length + trackHeader.length + trackEvents.length);
        result.set(header, 0);
        result.set(trackHeader, header.length);
        result.set(trackEvents, header.length + trackHeader.length);
        
        return result;
    }
    
    encodeVariableLength(value) {
        const result = [];
        result.push(value & 0x7F);
        
        while ((value >>= 7) > 0) {
            result.unshift((value & 0x7F) | 0x80);
        }
        
        return result;
    }
    
    downloadFile(blob, filename) {
        // Try Web Share API first (mobile)
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], filename)] })) {
            const file = new File([blob], filename);
            navigator.share({ files: [file] }).catch(console.error);
        } else {
            // Fallback to download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }
    
    updateDisplay() {
        document.getElementById('key-display').textContent = this.NOTES[this.currentTonic];
        document.getElementById('mode-display').textContent =
            this.currentMode.charAt(0).toUpperCase() + this.currentMode.slice(1);
        
        const fundamentalMidi = 60 + this.currentTonic + ((this.currentOctave - 4) * 12);
        const fundamental = 440 * Math.pow(2, (fundamentalMidi - 69) / 12);
        document.getElementById('freq-display').textContent = Math.round(fundamental);
    }
    
    updateZodiacWheel() {
        const segments = document.querySelectorAll('.zodiac-segment');
        segments.forEach((segment, index) => {
            segment.classList.toggle('active', index === this.currentTonic);
        });
    }
    
    initializeZodiacAnimations() {
        const zodiacWheel = document.querySelector('.zodiac-wheel');
        if (zodiacWheel) {
            // Add loading animation
            zodiacWheel.classList.add('loading');
            
            // Remove loading class after animation completes
            setTimeout(() => {
                zodiacWheel.classList.remove('loading');
            }, 1500);
        }
    }
    
    triggerTonicChangeAnimation() {
        const zodiacWheel = document.querySelector('.zodiac-wheel');
        if (zodiacWheel) {
            // Remove existing animation class
            zodiacWheel.classList.remove('tonic-change');
            
            // Force reflow and add animation class
            requestAnimationFrame(() => {
                zodiacWheel.classList.add('tonic-change');
                
                // Remove class after animation completes
                setTimeout(() => {
                    zodiacWheel.classList.remove('tonic-change');
                }, 800);
            });
        }
    }
    
    updateScaleNodeStates() {
        const nodes = document.querySelectorAll('.scale-node');
        nodes.forEach((node, index) => {
            const degree = parseInt(node.dataset.degree);
            const semitoneOffset = this.SCALES[this.currentMode][degree];
            const midiNote = 60 + this.currentTonic + semitoneOffset + ((this.currentOctave - 4) * 12);
            const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
            
            const isInRange = frequency >= 20 && frequency <= 18000;
            node.classList.toggle('dimmed', !isInRange);
            
            // Disable nodes if audio isn't ready
            node.classList.toggle('audio-disabled', !this.audioReady);
        });
    }
    
    handleVisibilityChange() {
        if (document.hidden) {
            this.stopAllNotes();
        }
    }
    
    saveSettings() {
        const settings = {
            tonic: this.currentTonic,
            mode: this.currentMode,
            octave: this.currentOctave
        };
        localStorage.setItem('cyberTuningFork', JSON.stringify(settings));
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('cyberTuningFork');
            if (saved) {
                const settings = JSON.parse(saved);
                this.currentTonic = settings.tonic || 0;
                const migratedMode = settings.mode === 'major'
                    ? 'ionian'
                    : settings.mode === 'minor'
                        ? 'aeolian'
                        : settings.mode;
                this.currentMode = this.SCALES[migratedMode] ? migratedMode : 'aeolian';
                this.currentOctave = settings.octave || 2;
                
                // Update UI
                const modeSelect = document.getElementById('mode-select');
                if (modeSelect) modeSelect.value = this.currentMode;
                if (settings.mode === 'major' || settings.mode === 'minor') {
                    this.saveSettings();
                }
            }
        } catch (error) {
            console.warn('Could not load settings:', error);
        }
    }
    
    showAudioNotReadyMessage() {
        const audioNotice = document.getElementById('audio-notice');
        if (audioNotice.classList.contains('hidden')) {
            audioNotice.classList.remove('hidden');
            audioNotice.style.background = 'rgba(255, 165, 0, 0.9)';
            audioNotice.textContent = '🔊 Please tap twice to enable audio!';
            audioNotice.style.opacity = '1';
            
            // Pulse effect to draw attention
            audioNotice.style.animation = 'pulse 1s ease-in-out 3';
            
            setTimeout(() => {
                audioNotice.style.animation = '';
                if (!this.audioReady) {
                    audioNotice.style.opacity = '0.7';
                }
            }, 3000);
        }
    }
    
    enableScaleNodes() {
        const nodes = document.querySelectorAll('.scale-node');
        nodes.forEach(node => {
            node.classList.remove('audio-disabled');
        });
        
        // Update the audio notice if it's showing the "tap elsewhere" message
        const audioNotice = document.getElementById('audio-notice');
        if (audioNotice && audioNotice.textContent.includes('tap elsewhere')) {
            audioNotice.style.background = 'rgba(0, 255, 0, 0.9)';
            audioNotice.textContent = '🎵 Planetary notes now available!';
            setTimeout(() => {
                audioNotice.style.opacity = '0';
                setTimeout(() => {
                    audioNotice.classList.add('hidden');
                }, 300);
            }, 1500);
        }
    }
    
    triggerNoteHaptic(pointerId) {
        if (!this.hapticSupported) return;
        
        // Count active notes to determine haptic pattern
        const activeNoteCount = this.activeNotes.size;
        
        // Determine haptic pattern based on musical context
        if (activeNoteCount === 0) {
            // Single note
            this.triggerHaptic('singleNote');
        } else if (activeNoteCount < 3) {
            // Small chord
            this.triggerHaptic('chord');
        } else {
            // Larger chord - more complex pattern
            this.triggerHaptic('longChord', 0.8); // Slightly softer for complex chords
        }
    }
    
    setupMobileSliders() {
        // Gain slider (left, mobile only)
        const gainSlider = document.getElementById('mobile-gain-slider');
        const gainDisplay = document.getElementById('mobile-gain-display');

        if (gainSlider && gainDisplay) {
            gainSlider.addEventListener('input', (e) => {
                this.gainAmount = parseInt(e.target.value, 10);
                gainDisplay.textContent = `${this.gainAmount}%`;

                if (this.workletNode && this.workletNode.port) {
                    this.workletNode.port.postMessage({
                        type: 'gain',
                        level: this.gainAmount / 100
                    });
                }
            });
            gainDisplay.textContent = `${this.gainAmount}%`;
        }

        // Vibrato slider (right of zodiac wheel, mobile only) — mirrors main slider
        const mVibSlider = document.getElementById('mobile-vibrato-slider');
        const mVibDisplay = document.getElementById('mobile-vibrato-display');
        const mainVibSlider = document.getElementById('vibrato-slider');
        const mainVibDisplay = document.getElementById('vibrato-display');

        if (mVibSlider && mVibDisplay) {
            mVibSlider.addEventListener('input', (e) => {
                this.vibratoAmount = parseInt(e.target.value);
                mVibDisplay.textContent = `${this.vibratoAmount}%`;
                // Keep main slider in sync
                if (mainVibSlider) mainVibSlider.value = this.vibratoAmount;
                if (mainVibDisplay) mainVibDisplay.textContent = `${this.vibratoAmount}%`;

                if (this.workletNode && this.workletNode.port) {
                    this.workletNode.port.postMessage({
                        type: 'vibrato',
                        depth: this.vibratoAmount / 100.0
                    });
                }
                this.checkBlackHolePortal();
            });
            mVibDisplay.textContent = '0%';
        }
    }

    setupVibratoSlider() {
        const vibratoSlider = document.getElementById('vibrato-slider');
        const vibratoDisplay = document.getElementById('vibrato-display');
        
        if (!vibratoSlider || !vibratoDisplay) return;
        
        vibratoSlider.addEventListener('input', (e) => {
            this.vibratoAmount = parseInt(e.target.value);
            vibratoDisplay.textContent = `${this.vibratoAmount}%`;

            // Keep mobile side slider in sync
            const mVibSlider = document.getElementById('mobile-vibrato-slider');
            const mVibDisplay = document.getElementById('mobile-vibrato-display');
            if (mVibSlider) mVibSlider.value = this.vibratoAmount;
            if (mVibDisplay) mVibDisplay.textContent = `${this.vibratoAmount}%`;
            
            // Send vibrato amount to audio worklet (0-1 scale)
            if (this.workletNode && this.workletNode.port) {
                this.workletNode.port.postMessage({
                    type: 'vibrato',
                    depth: this.vibratoAmount / 100.0
                });
            }
            
            console.log(`Vibrato set to ${this.vibratoAmount}%`);
        });
        
        // Initialize display
        vibratoDisplay.textContent = '0%';
    }
    
    initializeBlackHolePortal() {
        this.portalElement = document.getElementById('black-hole-portal');
    }
    
    checkForOctavePortal() {
        // Check if vibrato is at 100% and both octave notes (0 and 7) are playing
        if (this.vibratoAmount === 100) {
            const hasRoot = Array.from(this.activeNotes.values()).some(note => note.degree === 0);
            const hasOctave = Array.from(this.activeNotes.values()).some(note => note.degree === 7);
            
            if (hasRoot && hasOctave && !this.portalActive) {
                this.openPortal();
            } else if ((!hasRoot || !hasOctave) && this.portalActive) {
                this.closePortal();
            }
        } else if (this.portalActive) {
            this.closePortal();
        }
    }
    
    openPortal() {
        if (!this.portalElement) return;
        
        console.log('🌌 Black hole portal opening - octave detected at 100% vibrato!');
        this.portalActive = true;
        this.portalElement.classList.remove('hidden');
        this.portalElement.classList.add('active');
    }
    
    closePortal() {
        if (!this.portalElement) return;
        
        console.log('🌌 Black hole portal closing');
        this.portalActive = false;
        this.portalElement.classList.remove('active');
        
        // Hide after transition
        setTimeout(() => {
            if (!this.portalActive) {
                this.portalElement.classList.add('hidden');
            }
        }, 500);
    }
    
    showStatus(message, type = 'info') {
        const statusEl = document.getElementById('status-message');
        statusEl.textContent = message;
        statusEl.className = `status-message ${type}`;
        statusEl.classList.remove('hidden');
        
        // Auto-hide after delay
        setTimeout(() => {
            statusEl.classList.add('hidden');
        }, type === 'error' ? 5000 : 3000);
    }
    
    // ===== BRIDGE MODE FUNCTIONALITY =====
    
    // Auto-convert letters to numbers using Gematria
    parseInputWithGematria(input) {
        if (typeof input !== 'string') {
            return parseFloat(input);
        }
        
        const trimmed = input.trim();
        console.log(`🔍 Parsing input: "${trimmed}"`);
        
        // If it's already a number, parse it
        if (!isNaN(trimmed) && trimmed !== '') {
            const result = parseFloat(trimmed);
            console.log(`🔢 Numeric input: "${trimmed}" → ${result}`);
            return result;
        }
        
        // Convert letters to Gematria values (A=1, B=2, ..., Z=26)
        let sum = 0;
        let letterCount = 0;
        for (let i = 0; i < trimmed.length; i++) {
            const char = trimmed[i].toUpperCase();
            if (char >= 'A' && char <= 'Z') {
                const value = char.charCodeAt(0) - 64; // A=1, B=2, etc.
                sum += value;
                letterCount++;
                console.log(`🔤 Letter "${char}" = ${value}`);
            }
        }
        
        if (sum > 0) {
            console.log(`🔤 Gematria conversion: "${trimmed}" (${letterCount} letters) → ${sum}`);
            return sum;
        }
        
        // Fallback to number parsing
        const fallback = parseFloat(trimmed) || 0;
        console.log(`⚠️ Fallback parsing: "${trimmed}" → ${fallback}`);
        return fallback;
    }
    
    // New function to determine tonic from first number
    updateBridgeFromNumber() {
        if (!this.bridgeModules) {
            console.warn('Bridge modules not loaded yet');
            return;
        }
        
        try {
            // Get the first number input
            const inputAField = document.getElementById('input-a-number');
            const inputBField = document.getElementById('input-b-number');
            
            if (!inputAField || !inputBField) {
                console.warn('Bridge input fields not found');
                return;
            }
            
            const numberA = this.parseInputWithGematria(inputAField.value) || 1;
            const numberB = this.parseInputWithGematria(inputBField.value) || 2;
            
            // Store old tonic for Input B repositioning
            const oldTonicIndex = this.bridgeState.tonicIndex;
            
            // Store the numbers in Bridge state
            this.bridgeState.inputA = numberA;
            this.bridgeState.inputB = numberB;
            
            // Convert first number to fraction and quantize to nearest tonic
            const ratio = this.bridgeModules.localizeRatio(numberA, 0); // Use C as reference
            const etResult = this.bridgeModules.nearestET(ratio);
            
            // Determine tonic index from ET quantization
            const newTonicIndex = ((etResult.n % 12) + 12) % 12; // Ensure positive modulo
            this.bridgeState.tonicIndex = newTonicIndex;
            this.bridgeState.quantizedTonic = this.NOTES[newTonicIndex];
            
            // Input B repositioning: If tonic changed, preserve Input B's musical relationship to new tonic
            if (oldTonicIndex !== newTonicIndex) {
                let bSemitoneOffset = 0;
                
                // Calculate B's semitone offset from old tonic (handle both evaluated and raw cases)
                if (this.bridgeState.evaluatedB && this.bridgeState.evaluatedB.rLocal) {
                    const oldEtResult = this.bridgeModules.nearestET(this.bridgeState.evaluatedB.rLocal);
                    bSemitoneOffset = oldEtResult.n - oldTonicIndex; // Relative offset
                } else {
                    // Fallback: compute offset from raw numberB
                    const oldRatio = this.bridgeModules.localizeRatio(numberB, oldTonicIndex);
                    const oldEtResult = this.bridgeModules.nearestET(oldRatio);
                    bSemitoneOffset = oldEtResult.n - oldTonicIndex;
                }
                
                // Apply same relative offset to new tonic
                const newBSemitone = newTonicIndex + bSemitoneOffset;
                const newBRatio = Math.pow(2, newBSemitone / 12); // Convert back to ratio
                
                // Update Input B field with repositioned value
                const inputBField = document.getElementById('input-b-number');
                if (inputBField) {
                    inputBField.value = newBRatio.toFixed(3);
                    this.bridgeState.inputB = newBRatio;
                    console.log(`🔄 Input B repositioned: ${numberB.toFixed(3)} → ${newBRatio.toFixed(3)} (preserved ${bSemitoneOffset} semitone offset, tonic: ${this.NOTES[oldTonicIndex]} → ${this.NOTES[newTonicIndex]})`);
                }
            }
            
            // Calculate and display the ratio
            const simpleFraction = this.simplifyFraction(numberA);
            this.bridgeState.tonicRatio = simpleFraction;
            
            // Update tonic display
            const tonicElement = document.getElementById('quantized-tonic');
            const ratioElement = document.getElementById('tonic-ratio');
            
            if (tonicElement) {
                tonicElement.textContent = this.bridgeState.quantizedTonic;
            }
            if (ratioElement) {
                ratioElement.textContent = this.bridgeState.tonicRatio;
            }
            
            // Process both inputs with the determined tonic (use updated values after repositioning)
            const finalNumberA = this.bridgeState.inputA;
            const finalNumberB = this.bridgeState.inputB;
            
            const mappedA = this.bridgeModules.mapNumber(finalNumberA);
            const mappedB = this.bridgeModules.mapNumber(finalNumberB);
            
            if (mappedA) {
                this.bridgeState.evaluatedA = this.bridgeModules.evaluateET(mappedA, newTonicIndex);
            }
            
            if (mappedB) {
                this.bridgeState.evaluatedB = this.bridgeModules.evaluateET(mappedB, newTonicIndex);
            }
            
            // Calculate theta and classify
            if (this.bridgeState.evaluatedA && this.bridgeState.evaluatedB) {
                // CRITICAL: Input A is anchor (effects-free), so use ONLY Input B for effects
                const theta = this.bridgeState.evaluatedB.rm;
                
                // Input A: EFFECTS-FREE resonance anchor (no classifyET call)
                // Just add minimal quad/fx for UI display - no actual effects applied
                this.bridgeState.evaluatedA = {
                    ...this.bridgeState.evaluatedA,
                    quad: 'Ⓢ', // Default quadrant for display
                    fx: { // No-effect placeholder for consistency
                        vibDepth: 0, vibRate: 0,
                        flgDepth: 0, flgRate: 0, flgFeedback: 0,
                        detuneCents: 0, mode: 'anchor'
                    }
                };
                
                // Input B: FULL effects pipeline (receives all X/Y axis effects)
                this.bridgeState.evaluatedB = this.bridgeModules.classifyET(this.bridgeState.evaluatedB, theta);
                
                // Calculate cross-resonance
                this.bridgeState.crossResonance = this.bridgeModules.crossET(
                    this.bridgeState.evaluatedA,
                    this.bridgeState.evaluatedB,
                    { c0: 10, Gamma: 10, K: 1 },
                    theta
                );
                
                // Update UI displays
                this.updateBridgeDisplays();
                this.updateResonanceCompass();
            }
            
        } catch (error) {
            console.error('Bridge number processing error:', error);
        }
    }
    
    // Helper function to simplify fractions
    simplifyFraction(decimal) {
        const tolerance = 1e-6;
        let numerator = 1;
        let denominator = 1;
        
        // Find a reasonable fraction approximation
        for (let d = 1; d <= 16; d++) {
            const n = Math.round(decimal * d);
            if (Math.abs(n/d - decimal) < tolerance) {
                numerator = n;
                denominator = d;
                break;
            }
        }
        
        // Simplify the fraction
        const gcd = (a, b) => b ? gcd(b, a % b) : a;
        const divisor = gcd(numerator, denominator);
        return `${numerator/divisor}/${denominator/divisor}`;
    }
    
    async loadBridgeModules() {
        // Skip if already loaded
        if (this.bridgeModules) {
            console.log('✅ Bridge modules already loaded');
            return;
        }
        
        try {
            console.log('🔍 Loading Bridge modules on demand...');
            
            // Dynamic imports for Bridge modules (only when needed)
            const etModule = await import('./lib/bridge/et.js');
            console.log('✅ ET module loaded');
            
            const effectsModule = await import('./lib/bridge/effects.js');
            console.log('✅ Effects module loaded');
            
            const mapModule = await import('./lib/bridge/map.js');
            console.log('✅ Map module loaded');
            
            const evalModule = await import('./lib/bridge/eval.js');
            console.log('✅ Eval module loaded');
            
            const audioModule = await import('./lib/bridge/audio-bridge.js');
            console.log('✅ Audio bridge module loaded');
            
            const utilsModule = await import('./lib/bridge/utils.js');
            console.log('✅ Utils module loaded');
            
            // Store modules on instance for use in other methods
            this.bridgeModules = {
                ...etModule,
                ...effectsModule,
                ...mapModule,
                ...evalModule,
                ...audioModule,
                ...utilsModule
            };
            
            console.log('✅ Bridge modules loaded successfully:', Object.keys(this.bridgeModules));
        } catch (error) {
            console.error('❌ Failed to load Bridge modules:', error);
            throw error;
        }
    }
    
    async setupBridgeMode() {
        console.log('🌉 Setting up Bridge mode UI (modules loaded on demand)...');
        
        // Setup Bridge navigation safely
        try {
            this.ensureBridgeButton();
            
            const bridgeCloseButton = document.getElementById('bridge-close-button');
            if (bridgeCloseButton) {
                bridgeCloseButton.addEventListener('click', () => this.closeBridgeMode());
                console.log('✅ Bridge close button wired successfully');
            }
            
            // Setup Bridge UI components with error handling
            this.setupBridgeInputs();
            this.setupBridgeControls();
        } catch (error) {
            console.error('❌ Bridge setup error:', error.message, error.stack);
            // Continue initialization even if Bridge setup fails
        }
        
        // Initialize with default values
        this.updateBridgeFromNumber();
        
        console.log('✅ Bridge mode setup complete');
        console.log('🔍 setupBridgeMode completed');
    }
    
    ensureBridgeButton() {
        console.log('🔧 Ensuring Bridge button exists...');
        
        try {
            let bridgeNavButton = document.getElementById('bridge-nav-button');
            
            // Always ensure clean event listeners - remove any existing ones first
            if (bridgeNavButton) {
                console.log('🔧 Bridge button exists, ensuring clean event listeners...');
                
                // Remove any existing listeners safely using stored references
                if (bridgeNavButton._bridgeHandler) {
                    bridgeNavButton.removeEventListener('click', bridgeNavButton._bridgeHandler);
                    console.log('🧹 Removed existing Bridge listener');
                }
                // Legacy cleanup for old handler names
                if (bridgeNavButton._clickHandler) {
                    bridgeNavButton.removeEventListener('click', bridgeNavButton._clickHandler);
                    console.log('🧹 Removed legacy click listener');
                }
                if (bridgeNavButton._touchHandler) {
                    bridgeNavButton.removeEventListener('touchend', bridgeNavButton._touchHandler);
                    console.log('🧹 Removed legacy touch listener');
                }
            }
            
            if (!bridgeNavButton) {
                console.log('🚨 Bridge button missing - creating it dynamically');
                
                // Find or create navigation header
                let navHeader = document.querySelector('.navigation-header');
                if (!navHeader) {
                    navHeader = document.createElement('div');
                    navHeader.className = 'navigation-header';
                    const firstChild = document.body.firstChild;
                    if (firstChild) {
                        document.body.insertBefore(navHeader, firstChild);
                    } else {
                        document.body.appendChild(navHeader);
                    }
                    console.log('✅ Created navigation header');
                }
                
                // Create Bridge button
                bridgeNavButton = document.createElement('button');
                bridgeNavButton.id = 'bridge-nav-button';
                bridgeNavButton.className = 'nav-button bridge-button';
                bridgeNavButton.setAttribute('aria-label', 'Open Resonant Bridge mode');
                bridgeNavButton.innerHTML = `
                    <span class="bridge-symbol">Ξ</span>
                    <span class="bridge-label">Resonant Bridge</span>
                `;
                
                // Insert at beginning of nav header
                if (navHeader.firstChild) {
                    navHeader.insertBefore(bridgeNavButton, navHeader.firstChild);
                } else {
                    navHeader.appendChild(bridgeNavButton);
                }
                console.log('✅ Created Bridge button dynamically');
            }
            
            // Wire persistent event handler (created only once per class instance)
            if (bridgeNavButton) {
                // Create persistent handler only once
                if (!this.bridgeOpenHandler) {
                    this.bridgeOpenHandler = async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🎯 Bridge button activated!', e.type, e);
                        try {
                            await this.openBridgeMode();
                        } catch (error) {
                            console.error('❌ Error opening Bridge mode:', error);
                        }
                    };
                }
                
                // Clean and attach persistent handler
                bridgeNavButton.removeEventListener('click', this.bridgeOpenHandler);
                bridgeNavButton.addEventListener('click', this.bridgeOpenHandler, { passive: false });
                
                console.log('✅ Bridge button wired with persistent handler');
                
                // Mark that listeners are attached (mainly for debugging)
                bridgeNavButton.dataset.listenersAttached = 'true';
                
                // Make sure it's visible and not blocked
                bridgeNavButton.style.display = 'flex';
                bridgeNavButton.style.visibility = 'visible';
                bridgeNavButton.style.opacity = '1';
                bridgeNavButton.style.pointerEvents = 'auto';
                bridgeNavButton.style.zIndex = '10';
                bridgeNavButton.style.touchAction = 'manipulation'; // Better mobile performance
            }
            
            return bridgeNavButton;
        } catch (error) {
            console.error('❌ Error in ensureBridgeButton:', error.message, error.stack);
            return null;
        }
    }
    
    async openBridgeMode() {
        console.log('🌉 Opening Bridge mode');
        
        // Prevent double invocation with reentrancy guard
        if (this.isOpeningBridge) {
            console.log('⚠️ Bridge already opening, ignoring duplicate call');
            return;
        }
        this.isOpeningBridge = true;
        
        try {
            // Disable Bridge button to prevent double-activation
            const bridgeNavButton = document.getElementById('bridge-nav-button');
            if (bridgeNavButton) {
                bridgeNavButton.disabled = true;
                bridgeNavButton.style.pointerEvents = 'none';
            }
            
            // Load Bridge modules on demand for better performance
            await this.loadBridgeModules();
            
            this.bridgeMode = true;
            
            const mainScreen = document.getElementById('main-screen');
            const bridgeScreen = document.getElementById('bridge-screen');
            
            console.log('🔍 Bridge screens found:', { mainScreen: !!mainScreen, bridgeScreen: !!bridgeScreen });
            
            if (mainScreen) mainScreen.classList.add('hidden');
            if (bridgeScreen) bridgeScreen.classList.remove('hidden');
            
            // Update bridge state from main app
            this.bridgeState.tonicIndex = this.currentTonic;
            this.bridgeState.vibrato = this.vibratoAmount;
            
            console.log('🔍 Bridge state updated:', this.bridgeState);
            
            // Sync vibrato slider
            const bridgeVibratoSlider = document.getElementById('bridge-vibrato-slider');
            const bridgeVibratoDisplay = document.getElementById('bridge-vibrato-display');
            if (bridgeVibratoSlider) {
                bridgeVibratoSlider.value = this.bridgeState.vibrato;
            }
            if (bridgeVibratoDisplay) {
                bridgeVibratoDisplay.textContent = `${this.bridgeState.vibrato}%`;
            }
            
            // Zodiac wheel removed from Bridge mode
            console.log('🔍 About to call updateBridgeInputs...');
            this.updateBridgeInputs();
            console.log('✅ Bridge mode opened successfully');
            
        } catch (error) {
            console.error('❌ Error opening Bridge mode:', error.message, error.stack);
        } finally {
            this.isOpeningBridge = false;
        }
    }
    
    closeBridgeMode() {
        console.log('🌉 Closing Bridge mode');
        this.bridgeMode = false;
        
        const mainScreen = document.getElementById('main-screen');
        const bridgeScreen = document.getElementById('bridge-screen');
        
        if (mainScreen) mainScreen.classList.remove('hidden');
        if (bridgeScreen) bridgeScreen.classList.add('hidden');
        
        // Sync vibrato back to main app
        this.vibratoAmount = this.bridgeState.vibrato;
        const mainVibratoSlider = document.getElementById('vibrato-slider');
        const mainVibratoDisplay = document.getElementById('vibrato-display');
        if (mainVibratoSlider) {
            mainVibratoSlider.value = this.vibratoAmount;
        }
        if (mainVibratoDisplay) {
            mainVibratoDisplay.textContent = `${this.vibratoAmount}%`;
        }
        
        // CRITICAL: Re-enable Bridge button for next use (persistent handler already attached)
        const bridgeNavButton = document.getElementById('bridge-nav-button');
        if (bridgeNavButton) {
            // Simply re-enable the button (persistent handler stays attached)
            bridgeNavButton.disabled = false;
            bridgeNavButton.style.pointerEvents = 'auto';
            console.log('🔄 Bridge button re-enabled for next use');
        }
        
        // Ensure Bridge screen overlay is fully disabled
        const bridgeScreenElement = document.getElementById('bridge-screen');
        if (bridgeScreenElement) {
            bridgeScreenElement.style.pointerEvents = 'none';
        }
    }
    
    // Zodiac wheel removed - tonic determined by first number input
    
    // setBridgeTonic removed - tonic determined automatically by first number
    
    // updateBridgeZodiacWheel removed - no zodiac wheel in Bridge mode
    
    setupBridgeInputs() {
        // Only number input field changes
        const inputAField = document.getElementById('input-a-number');
        const inputBField = document.getElementById('input-b-number');
        
        if (inputAField) {
            inputAField.addEventListener('input', () => {
                console.log(`🎯 Input A changed: "${inputAField.value}"`);
                this.updateBridgeFromNumber();
            });
            inputAField.addEventListener('change', () => {
                console.log(`🎯 Input A finalized: "${inputAField.value}"`);
                this.updateBridgeFromNumber();
            });
        }
        
        if (inputBField) {
            inputBField.addEventListener('input', () => {
                console.log(`🎯 Input B changed: "${inputBField.value}"`);
                this.updateBridgeFromNumber();
            });
            inputBField.addEventListener('change', () => {
                console.log(`🎯 Input B finalized: "${inputBField.value}"`);
                this.updateBridgeFromNumber();
            });
        }
    }
    
    switchBridgeInputType(input, type) {
        console.log(`🌉 Switching input ${input.toUpperCase()} to ${type}`);
        
        // Update state
        const inputState = input === 'a' ? this.bridgeState.inputA : this.bridgeState.inputB;
        inputState.type = type;
        
        // Update UI - tabs
        document.querySelectorAll(`[data-input="${input}"] .input-tab`).forEach(tab => {
            tab.classList.toggle('active', tab.dataset.type === type);
        });
        
        // Update UI - inputs
        ['text', 'number', 'date'].forEach(inputType => {
            const field = document.getElementById(`input-${input}-${inputType}`);
            if (field) {
                if (inputType === type) {
                    field.classList.remove('hidden');
                    field.classList.add('active');
                } else {
                    field.classList.add('hidden');
                    field.classList.remove('active');
                }
            }
        });
        
        this.updateBridgeInputs();
    }
    
    updateBridgeInputs() {
        if (!this.bridgeModules) {
            console.warn('Bridge modules not loaded yet');
            return;
        }
        
        try {
            // Process Input A - use values already processed by updateBridgeFromNumber
            if (this.bridgeState.inputA !== undefined) {
                const mappedA = this.bridgeModules.mapNumber(this.bridgeState.inputA);
                this.bridgeState.evaluatedA = this.bridgeModules.evaluateET(mappedA, this.bridgeState.tonicIndex);
            }
            
            // Process Input B - use values already processed by updateBridgeFromNumber
            if (this.bridgeState.inputB !== undefined) {
                const mappedB = this.bridgeModules.mapNumber(this.bridgeState.inputB);
                this.bridgeState.evaluatedB = this.bridgeModules.evaluateET(mappedB, this.bridgeState.tonicIndex);
            }
            
            // Calculate theta and classify
            if (this.bridgeState.evaluatedA && this.bridgeState.evaluatedB) {
                // CRITICAL: Input A is anchor (effects-free), so use ONLY Input B for effects
                const theta = this.bridgeState.evaluatedB.rm;
                
                // Input A: EFFECTS-FREE resonance anchor (no classifyET call)
                // Just add minimal quad/fx for UI display - no actual effects applied
                this.bridgeState.evaluatedA = {
                    ...this.bridgeState.evaluatedA,
                    quad: 'Ⓢ', // Default quadrant for display
                    fx: { // No-effect placeholder for consistency
                        vibDepth: 0, vibRate: 0,
                        flgDepth: 0, flgRate: 0, flgFeedback: 0,
                        detuneCents: 0, mode: 'anchor'
                    }
                };
                
                // Input B: FULL effects pipeline (receives all X/Y axis effects)
                this.bridgeState.evaluatedB = this.bridgeModules.classifyET(this.bridgeState.evaluatedB, theta);
                
                // Calculate cross-resonance
                this.bridgeState.crossResonance = this.bridgeModules.crossET(
                    this.bridgeState.evaluatedA,
                    this.bridgeState.evaluatedB,
                    { c0: 10, Gamma: 10, K: 1 },
                    theta
                );
                
                // Update UI displays
                this.updateBridgeDisplays();
                this.updateResonanceCompass();
            }
        } catch (error) {
            console.error('Bridge input update error:', error);
        }
    }
    
    // getBridgeInputValue removed - values handled directly by updateBridgeFromNumber
    
    updateBridgeDisplays() {
        // Update Input A display
        if (this.bridgeState.evaluatedA) {
            const deltaA = document.getElementById('delta-a');
            const quadA = document.getElementById('quad-a');
            
            if (deltaA) {
                const cents = Math.round(this.bridgeState.evaluatedA.deltaC_et);
                const sign = cents >= 0 ? '+' : '';
                deltaA.textContent = `${sign}${cents}¢`;
            }
            
            if (quadA) {
                quadA.textContent = this.bridgeState.evaluatedA.quad;
            }
        }
        
        // Update Input B display
        if (this.bridgeState.evaluatedB) {
            const deltaB = document.getElementById('delta-b');
            const quadB = document.getElementById('quad-b');
            
            if (deltaB) {
                const cents = Math.round(this.bridgeState.evaluatedB.deltaC_et);
                const sign = cents >= 0 ? '+' : '';
                deltaB.textContent = `${sign}${cents}¢`;
            }
            
            if (quadB) {
                quadB.textContent = this.bridgeState.evaluatedB.quad;
            }
        }
    }
    
    updateResonanceCompass() {
        if (!this.bridgeState.evaluatedA || !this.bridgeState.evaluatedB || !this.bridgeModules) return;
        
        const pointA = document.getElementById('point-a');
        const pointB = document.getElementById('point-b');
        
        if (pointA && pointB) {
            // Normalize and position points
            const normalizeX = (deltaC) => {
                const x = Math.abs(deltaC) / 100; // Scale by 100 cents
                return 100 + (deltaC >= 0 ? 1 : -1) * Math.min(x, 1) * 80;
            };
            
            const normalizeY = (rm, theta) => {
                const y = rm / (theta * 2);
                return 100 - Math.min(y, 1) * 80;
            };
            
            const theta = this.bridgeModules.median([this.bridgeState.evaluatedA.rm, this.bridgeState.evaluatedB.rm]);
            
            const xA = normalizeX(this.bridgeState.evaluatedA.deltaC_et);
            const yA = normalizeY(this.bridgeState.evaluatedA.rm, theta);
            const xB = normalizeX(this.bridgeState.evaluatedB.deltaC_et);
            const yB = normalizeY(this.bridgeState.evaluatedB.rm, theta);
            
            pointA.setAttribute('cx', xA);
            pointA.setAttribute('cy', yA);
            pointB.setAttribute('cx', xB);
            pointB.setAttribute('cy', yB);
        }
    }
    
    setupBridgeControls() {
        // Play buttons
        const playA = document.getElementById('play-a');
        const playB = document.getElementById('play-b');
        const playBridge = document.getElementById('play-bridge');
        
        if (playA) {
            playA.addEventListener('click', () => this.playBridgeInput('a'));
        }
        
        if (playB) {
            playB.addEventListener('click', () => this.playBridgeInput('b'));
        }
        
        if (playBridge) {
            playBridge.addEventListener('click', () => this.playBridgeCross());
        }
        
        // Vibrato slider
        const vibratoSlider = document.getElementById('bridge-vibrato-slider');
        const vibratoDisplay = document.getElementById('bridge-vibrato-display');
        
        if (vibratoSlider) {
            vibratoSlider.addEventListener('input', (e) => {
                this.bridgeState.vibrato = parseInt(e.target.value);
                if (vibratoDisplay) {
                    vibratoDisplay.textContent = `${this.bridgeState.vibrato}%`;
                }
            });
        }
    }
    
    
    // Calculate the tonic frequency based on Input A's ET quantization (Input A sets the tonic)
    calculateTonicFrequency() {
        if (this.bridgeState.evaluatedA && this.bridgeState.tonicIndex !== undefined) {
            // CRITICAL: Always use lowest frequency for each note class to prevent pitch escalation
            // Base frequencies for C2 octave (lowest practical frequencies)
            const lowestNoteFrequencies = [
                65.41,   // C2
                69.30,   // C#2
                73.42,   // D2
                77.78,   // D#2
                82.41,   // E2
                87.31,   // F2
                92.50,   // F#2
                98.00,   // G2
                103.83,  // G#2
                110.00,  // A2
                116.54,  // A#2
                123.47   // B2
            ];
            
            // Use the note class from tonic index, always at lowest frequency
            // Safety guard: ensure tonicIndex is in valid range
            const safeTonicIndex = Math.max(0, Math.min(11, this.bridgeState.tonicIndex || 0));
            const tonicFrequency = lowestNoteFrequencies[safeTonicIndex];
            const noteName = this.NOTES[safeTonicIndex];
            
            console.log(`🎯 Input A tonic: ${noteName} at ${tonicFrequency.toFixed(1)}Hz (lowest frequency, prevents pitch escalation)`);
            return tonicFrequency;
        } else {
            // Fallback to main app's tonic if Input A not evaluated
            const tonicMidiNote = 60 + this.currentTonic + ((this.currentOctave - 4) * 12);
            const frequency = 440 * Math.pow(2, (tonicMidiNote - 69) / 12);
            console.log(`⚠️ Using fallback tonic frequency: ${frequency.toFixed(1)}Hz`);
            return frequency;
        }
    }
    
    playBridgeInput(input) {
        const evaluated = input === 'a' ? this.bridgeState.evaluatedA : this.bridgeState.evaluatedB;
        if (!evaluated) {
            console.warn(`Cannot play input ${input.toUpperCase()}: not evaluated`);
            return;
        }
        
        console.log(`🌉 Playing Bridge input ${input.toUpperCase()}`);
        
        if (!this.bridgeModules) {
            console.warn('Bridge modules not loaded');
            return;
        }
        
        // Calculate proper tonic frequency based on current chromatic scale settings
        const tonicFrequency = this.calculateTonicFrequency();
        // For single input playback, we don't have the other input's frequency reference
        const audioParams = this.bridgeModules.toAudioParams(evaluated, this.bridgeState.vibrato, tonicFrequency, input === 'a', null);
        const pan = input === 'a' ? -0.6 : 0.6;
        
        this.playBridgeTone(audioParams, pan, 2000); // 2 second duration
    }
    
    playBridgeCross() {
        // Toggle indefinite playback of inputs 1 and 2 simultaneously
        if (this.bridgeState.isPlaying) {
            this.stopBridgePlayback();
        } else {
            this.startBridgePlayback();
        }
    }
    
    startBridgePlayback() {
        if (!this.bridgeState.evaluatedA || !this.bridgeState.evaluatedB) {
            console.warn('Cannot start bridge playback: inputs not evaluated');
            return;
        }
        
        if (!this.bridgeModules) {
            console.warn('Bridge modules not loaded');
            return;
        }
        
        console.log('🌉 Starting indefinite Bridge playback (inputs 1 & 2)');
        
        this.bridgeState.isPlaying = true;
        this.updateBridgeButton();
        
        // Calculate tonic frequency
        const tonicFrequency = this.calculateTonicFrequency();
        
        // Start Input A (left channel, indefinite)
        let inputAFreq = null;
        if (this.bridgeState.evaluatedA) {
            const paramsA = this.bridgeModules.toAudioParams(this.bridgeState.evaluatedA, this.bridgeState.vibrato, tonicFrequency, true);
            inputAFreq = paramsA.fObs; // Store Input A's frequency for Input B
            this.playBridgeToneIndefinite(paramsA, -0.6, 'inputA');
        }
        
        // Start Input B (right channel, indefinite) - positioned relative to Input A
        if (this.bridgeState.evaluatedB) {
            const paramsB = this.bridgeModules.toAudioParams(this.bridgeState.evaluatedB, this.bridgeState.vibrato, tonicFrequency, false, inputAFreq);
            this.playBridgeToneIndefinite(paramsB, 0.6, 'inputB');
        }
    }
    
    stopBridgePlayback() {
        console.log('🌉 Stopping Bridge playback');
        
        this.bridgeState.isPlaying = false;
        this.updateBridgeButton();
        
        // Clear all active intervals
        this.bridgeState.activeIntervals.forEach(intervalId => {
            clearInterval(intervalId);
        });
        this.bridgeState.activeIntervals = [];
    }
    
    updateBridgeButton() {
        const bridgeButton = document.getElementById('play-bridge');
        if (bridgeButton) {
            bridgeButton.textContent = this.bridgeState.isPlaying ? 'Stop Bridge' : 'Bridge';
            bridgeButton.setAttribute('aria-label', this.bridgeState.isPlaying ? 'Stop Bridge playback' : 'Start Bridge playback');
        }
    }
    
    playBridgeToneIndefinite(params, pan, id) {
        // Play a single tone, then restart it every 2 seconds for indefinite playback
        const playOnce = () => {
            this.playBridgeTone(params, pan, 2000);
        };
        
        // Play immediately
        playOnce();
        
        // Set up interval for continuous playback
        const intervalId = setInterval(playOnce, 1800); // Slight overlap to prevent gaps
        this.bridgeState.activeIntervals.push(intervalId);
        
        console.log(`🔄 Started indefinite playback for ${id}`);
    }
    
    playBridgeTone(params, pan, duration) {
        if (!this.audioContext || !this.workletNode) {
            console.warn('Audio not ready for Bridge playback');
            return;
        }
        
        console.log(`🎵 Bridge tone: fObs=${params.fObs.toFixed(1)}Hz, fArch=${params.fArch.toFixed(1)}Hz, pan=${pan}`);
        
        try {
            // Create sophisticated audio chain with effects implementation
            this.createAdvancedBridgeVoice(params, pan, duration);
        } catch (error) {
            console.error('Bridge playback error:', error);
        }
    }
    
    createAdvancedBridgeVoice(params, pan, duration) {
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        
        // CRITICAL FIX: Restore dual-frequency Bridge (fObs + fArch)
        // Create observed oscillator with quadrant-based waveform  
        const obsOsc = ctx.createOscillator();
        obsOsc.type = params.waveform || 'sine';
        
        // CRITICAL: No static detune applied - cent offset is display-only
        // Both oscillators play exact ET frequency as bound by frequency binding
        obsOsc.frequency.setValueAtTime(params.fObs, now);
        
        // Create archetypal oscillator (ET-clean reference)
        const archOsc = ctx.createOscillator();
        archOsc.type = params.waveform || 'sine';
        archOsc.frequency.setValueAtTime(params.fArch, now);
        
        // Create vibrato LFO (modulates both oscillators' detune)
        const vibratoLFO = ctx.createOscillator();
        const vibratoGain = ctx.createGain();
        vibratoLFO.type = 'sine';
        vibratoLFO.frequency.setValueAtTime(params.vibRate, now);
        vibratoGain.gain.setValueAtTime(params.vibDepthCents, now);
        
        // Connect vibrato: LFO -> Gain -> Both Oscillators.detune
        vibratoLFO.connect(vibratoGain);
        vibratoGain.connect(obsOsc.detune);
        vibratoGain.connect(archOsc.detune);
        
        // DISSONANCE EFFECTS: Ring Modulation + Tremolo for extreme dissonance simulation
        // Based on degree of deviation beyond 30¢ (30-50¢ range = 0-100% effect intensity)
        let ringModulator = null, tremoloLFO = null, tremoloGain = null;
        
        if (params.mode === 'detune' && (params.ringModDepth > 0 || params.tremoloDepth > 0)) {
            // Ring Modulation: Creates inharmonic sidebands for harsh dissonance
            if (params.ringModDepth > 0) {
                ringModulator = ctx.createOscillator();
                const ringModGain = ctx.createGain();
                
                ringModulator.type = 'sine';
                ringModulator.frequency.setValueAtTime(params.ringModFreq, now);
                ringModGain.gain.setValueAtTime(params.ringModDepth * 0.5, now); // Scale for mix control
                
                // Connect ring modulation: Ring Osc -> Gain -> Both Oscillators
                ringModulator.connect(ringModGain);
                ringModGain.connect(obsOsc.frequency);  // Modulate observed osc frequency
                ringModGain.connect(archOsc.frequency); // Modulate archetypal osc frequency
                
                ringModulator.start(now);
                console.log(`🌀 Ring mod applied: ${params.ringModFreq.toFixed(1)}Hz @ ${(params.ringModDepth*100).toFixed(0)}% depth`);
            }
            
            // Tremolo: Rhythmic amplitude modulation for textural dissonance
            if (params.tremoloDepth > 0) {
                tremoloLFO = ctx.createOscillator();
                tremoloGain = ctx.createGain();
                
                tremoloLFO.type = 'sine';
                tremoloLFO.frequency.setValueAtTime(params.tremoloRate, now);
                tremoloGain.gain.setValueAtTime(params.tremoloDepth * 0.5, now); // Half depth for bipolar LFO
                
                // Connect tremolo: LFO -> Gain (will connect to mainGain.gain later)
                tremoloLFO.connect(tremoloGain);
                tremoloLFO.start(now);
                console.log(`📳 Tremolo applied: ${params.tremoloRate.toFixed(1)}Hz @ ${(params.tremoloDepth*100).toFixed(0)}% depth`);
            }
        }
        // NOTE: Maintain pure ET frequencies - dissonance comes from effects, not pitch deviation
        
        // Create flanger (DelayNode with LFO modulation)
        const delay = ctx.createDelay(0.02); // Max 20ms delay
        const flangerLFO = ctx.createOscillator();
        const flangerGain = ctx.createGain();
        const flangerFeedback = ctx.createGain();
        
        flangerLFO.type = 'sine';
        flangerLFO.frequency.setValueAtTime(params.flgRate, now);
        flangerGain.gain.setValueAtTime(params.flgDepthMs / 1000, now); // Convert ms to seconds
        flangerFeedback.gain.setValueAtTime(params.flgFeedback, now);
        
        // Base delay time (3ms + modulation)
        delay.delayTime.setValueAtTime(0.003, now);
        
        // Connect flanger: LFO -> Gain -> Delay.delayTime  
        flangerLFO.connect(flangerGain);
        flangerGain.connect(delay.delayTime);
        
        // Create brightness filter (low-pass based on Y axis)
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(params.brightness || 4000, now);
        filter.Q.setValueAtTime(1.0, now);
        
        // Create gain for volume control and envelope
        const mainGain = ctx.createGain();
        const effectiveGain = (params.gain || 1.0) * 0.15;
        
        // Envelope: attack, sustain, release
        mainGain.gain.setValueAtTime(0, now);
        mainGain.gain.linearRampToValueAtTime(effectiveGain, now + 0.01); // Quick attack
        mainGain.gain.linearRampToValueAtTime(effectiveGain * 0.8, now + duration / 1000 - 0.05); // Sustain
        mainGain.gain.linearRampToValueAtTime(0, now + duration / 1000); // Release
        
        // Apply tremolo to main gain if active (modulates amplitude)
        let tremoloOffset = null;
        if (tremoloLFO && tremoloGain) {
            // Proper tremolo routing: LFO + offset -> mainGain.gain AudioParam
            tremoloOffset = ctx.createConstantSource();
            tremoloOffset.offset.setValueAtTime(1.0, now); // Unity gain center
            tremoloOffset.start(now);
            
            // Connect both tremolo modulation and offset to mainGain.gain
            tremoloGain.connect(mainGain.gain);
            tremoloOffset.connect(mainGain.gain);
        }
        
        // Create panner for stereo positioning
        const panner = ctx.createStereoPanner();
        panner.pan.setValueAtTime(pan, now);
        
        // Create dry/wet mix for flanger (unity gain: dry + wet = 1.0)
        const dryGain = ctx.createGain();
        const wetGain = ctx.createGain();
        const wetMix = (params.flgDepthMs || 0) > 0 ? 0.3 : 0; // Only apply wet when flanger active
        dryGain.gain.setValueAtTime(1.0 - wetMix, now); // Compensate dry for wet
        wetGain.gain.setValueAtTime(wetMix, now);
        
        // Create separate gains for observed and archetypal oscillators
        const obsGain = ctx.createGain();
        const archGain = ctx.createGain();
        obsGain.gain.setValueAtTime(0.6, now); // Observed is more prominent
        archGain.gain.setValueAtTime(0.4, now); // Archetypal provides ET reference
        
        // Add subtle distortion for Input A only (pan = -0.6)
        let distortion = null;
        if (pan === -0.6) { // Input A only
            distortion = ctx.createWaveShaper();
            
            // Create subtle distortion curve for texture and volume
            const samples = 44100;
            const curve = new Float32Array(samples);
            const degree = 15; // Subtle distortion
            for (let i = 0; i < samples; i++) {
                const x = (i * 2) / samples - 1;
                curve[i] = ((3 + degree) * x * 20 * Math.PI / 180) / (Math.PI + degree * Math.abs(x));
            }
            distortion.curve = curve;
            distortion.oversample = '2x';
            console.log(`🎸 Subtle distortion applied to Input A for texture and volume`);
        }
        
        // Connect the audio graph:
        // Both Oscillators -> Individual Gains -> [Distortion (Input A only)] -> Filter (brightness) -> Split to dry/wet paths
        obsOsc.connect(obsGain);
        archOsc.connect(archGain);
        
        if (distortion) {
            // Input A path with distortion: Gains -> Distortion -> Filter
            obsGain.connect(distortion);
            archGain.connect(distortion);
            distortion.connect(filter);
        } else {
            // Input B path without distortion: Gains -> Filter
            obsGain.connect(filter);
            archGain.connect(filter);
        }
        
        // BYPASS LOGIC: Only route through flanger if flanger depth > 0
        if ((params.flgDepthMs || 0) > 0) {
            // Split path with flanger effect
            // Dry path: Filter -> DryGain -> MainGain
            filter.connect(dryGain);
            dryGain.connect(mainGain);
            
            // Wet path: Filter -> Delay -> WetGain -> MainGain  
            filter.connect(delay);
            delay.connect(wetGain);
            wetGain.connect(mainGain);
            
            // Feedback path: Delay -> Feedback -> Delay
            delay.connect(flangerFeedback);
            flangerFeedback.connect(delay);
        } else {
            // BYPASS: Direct connection for unity gain when flanger off
            filter.connect(mainGain);
        }
        
        // Final output: MainGain -> Panner -> Compressor -> Destination
        mainGain.connect(panner);
        panner.connect(this.compressor || ctx.destination);
        
        // Start all oscillators
        obsOsc.start(now);
        archOsc.start(now);
        vibratoLFO.start(now);
        flangerLFO.start(now);
        
        // Stop everything after duration
        const stopTime = now + duration / 1000;
        obsOsc.stop(stopTime);
        archOsc.stop(stopTime);
        vibratoLFO.stop(stopTime);
        flangerLFO.stop(stopTime);
        
        console.log(`🎚️ Advanced voice: ${params.mode} mode, waveform=${params.waveform}, brightness=${(params.brightness || 4000).toFixed(0)}Hz, vib=${params.vibDepthCents.toFixed(1)}¢, flg=${params.flgDepthMs.toFixed(2)}ms`);
    }
}

// Initialize app - handle both loading states
console.log('main.js loaded, readyState=', document.readyState);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOMContentLoaded fired, starting app');
        new CyberTuningFork();
    });
} else {
    console.log('DOM already loaded, starting app immediately');
    new CyberTuningFork();
}
