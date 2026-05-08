/**
 * Application - Main application controller
 */
class Application {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas element with id "${canvasId}" not found`);
        }

        this.gl = this.initializeWebGL();
        this.renderer = new Renderer(this.gl, this.canvas);
        this.trackball = null;
        this.config = SurfaceConfig;
        this.sensor = null;
        this.sensorMatrix = null;
        this.audio = new AudioManager();
    }

    /**
     * Initialize WebGL context
     */
    initializeWebGL() {
        const gl = this.canvas.getContext("webgl");
        if (!gl) {
            throw new Error("Browser does not support WebGL");
        }
        return gl;
    }

    /**
     * Load shaders from separate files
     */
    async loadShaders() {
        const program = await ShaderLoader.loadProgram(
            this.gl,
            'src/shaders/vertexShader.glsl',
            'src/shaders/fragmentShader.glsl'
        );
        this.renderer.setShaderProgram(program);
    }

    /**
     * Create and initialize models
     */
    createModels() {
        const surface = new ParametricSurface(this.gl, 'surface', this.config);
        surface.generateSurface();
        this.renderer.addModel('surface', surface);

        const sphere = new SphereModel(this.gl, 'sphere');
        sphere.generate(0.15, 20, 20);
        this.renderer.addModel('sphere', sphere);
    }

    /**
     * Load all textures
     */
    loadTextures() {
        const { textureManager } = this.renderer;
        const draw = () => this.draw();

        // Load surface textures
        textureManager.loadTexture('diffuse', 'textures/diffuse.jpg', draw);
        textureManager.loadTexture('specular', 'textures/specular.jpg', draw);
        textureManager.loadTexture('normal', 'textures/normal.jpg', draw);

        // Create solid textures for potential future use
        textureManager.createSolidTexture('white', 255, 255, 255, 255);
        textureManager.createSolidTexture('flatNormal', 128, 128, 255, 255);
    }

    /**
     * Set up trackball rotation controller
     */
    setupTrackball() {
        this.trackball = new TrackballRotator(
            this.canvas,
            () => this.draw(),
            0
        );
    }

    /**
     * Set up UI controls
     */
    setupUIControls() {
        // Mesh density controls
        const rStepsSlider = document.getElementById("rStepsSlider");
        const vStepsSlider = document.getElementById("vStepsSlider");
        const rStepsValue = document.getElementById("rStepsValue");
        const vStepsValue = document.getElementById("vStepsValue");

        if (rStepsSlider && rStepsValue) {
            rStepsSlider.addEventListener("input", () => {
                rStepsValue.textContent = rStepsSlider.value;
                const surface = this.renderer.getModel('surface');
                if (surface) {
                    surface.updateMeshDensity(parseInt(rStepsSlider.value), undefined);
                    this.draw();
                }
            });
        }

        if (vStepsSlider && vStepsValue) {
            vStepsSlider.addEventListener("input", () => {
                vStepsValue.textContent = vStepsSlider.value;
                const surface = this.renderer.getModel('surface');
                if (surface) {
                    surface.updateMeshDensity(undefined, parseInt(vStepsSlider.value));
                    this.draw();
                }
            });
        }
    }

    draw() {
        if (!this.trackball) return;
        const target = this.renderer.sphereTarget;
        if (target) {
            const alpha = 0.15;
            const cur = this.renderer.spherePos;
            this.renderer.spherePos = [
                cur[0] + alpha * (target[0] - cur[0]),
                cur[1] + alpha * (target[1] - cur[1]),
                cur[2] + alpha * (target[2] - cur[2]),
            ];
        }
        this.audio.setPannerPosition(...this.renderer.spherePos);
        this.drawMeters();
        const viewMatrix = this.trackball.getViewMatrix();
        if (this.renderer.stereoShaderProg) {
            this.renderer.renderStereo(viewMatrix);
        } else {
            this.renderer.render(viewMatrix);
        }
    }

    /**
     * Start the animation loop
     */
    drawMeters() {
        const canvas = document.getElementById('meterCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const rowH = Math.floor(h / 2) - 2;

        ctx.clearRect(0, 0, w, h);

        this._drawWaveform(ctx, this.audio.analyserL, 0,        rowH, w, 'L');
        this._drawWaveform(ctx, this.audio.analyserR, rowH + 4, rowH, w, 'R');
    }

    _drawWaveform(ctx, analyser, y, h, w, label) {
        if (!analyser) return;
        const data = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(data);

        ctx.clearRect(0, y, w, h);

        const gain = 3;
        const mid = y + h / 2;
        const color = '#007acc';

        const points = Array.from(data, (v, i) => ({
            x: (i / (data.length - 1)) * w,
            y: mid + ((v - 128) / 128) * gain * h / 2,
        }));

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length - 1; i++) {
            const mx = (points[i].x + points[i + 1].x) / 2;
            const my = (points[i].y + points[i + 1].y) / 2;
            ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my);
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.font = '10px Arial';
        ctx.fillText(label, 4, y + 10);
    }

    startAnimation() {
        this.renderer.startAnimation(() => this.draw());
    }

    /**
     * Load stereo shaders and initialize stereo camera
     */
    async loadStereoShaders() {
        const program = await ShaderLoader.loadProgram(
            this.gl,
            'src/shaders/stereoVertexShader.glsl',
            'src/shaders/stereoFragmentShader.glsl'
        );
        this.renderer.setStereoShaderProgram(program);
        this.renderer.initStereoCamera();
        this.renderer.initWebcamQuad();
    }

    /**
     * Set up webcam capture
     */
    setupWebcam() {
        const video = document.createElement('video');
        video.autoplay = true;
        this.renderer.setWebcamVideo(video);

        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                video.srcObject = stream;

                const track = stream.getVideoTracks()[0];
                const settings = track.getSettings();

                video.oncanplay = () => {
                    this.renderer.createWebcamTexture(settings.width, settings.height);
                };

                video.onloadedmetadata = () => {
                    video.play();
                };
            })
            .catch(err => {
                console.log('Webcam unavailable:', err.name + ': ' + err.message);
            });
    }

    setupSensor() {
        const connectBtn = document.getElementById('sensorConnectBtn');
        const hostInput  = document.getElementById('sensorHost');
        const portInput  = document.getElementById('sensorPort');

        this.sensor = new SensorConnection(
            (matrix) => {
                this.sensorMatrix = matrix;
                const p = m4.transformVector(matrix, [2, 0, 0, 1]);
                this.renderer.sphereTarget = [p[0], p[1], p[2]];
            },
            (status) => {
                const el = document.getElementById('sensorStatus');
                if (el) el.textContent = status;
                if (connectBtn) {
                    connectBtn.textContent = (status === 'connected') ? 'Disconnect' : 'Connect';
                }
            }
        );

        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                if (this.sensor.isConnected()) {
                    this.sensor.disconnect();
                    this.sensorMatrix = null;
                } else {
                    const host = hostInput ? hostInput.value.trim() : '192.168.0.101';
                    const port = portInput ? parseInt(portInput.value) : 8080;
                    this.sensor.connect(host, port);
                }
            });
        }
    }

    /**
     * Wire up model position sliders
     */
    setupModelPositionControls() {
        const bind = (id, valId, setter, format = v => v) => {
            const slider = document.getElementById(id);
            const display = document.getElementById(valId);
            if (!slider) return;
            slider.addEventListener('input', () => {
                const raw = parseFloat(slider.value);
                if (display) display.textContent = format(raw);
                setter(raw);
                this.draw();
            });
        };

        bind('modelXSlider', 'modelXValue',
            v => { this.renderer.modelX = v / 100; },
            v => (v / 100).toFixed(2)
        );
        bind('modelYSlider', 'modelYValue',
            v => { this.renderer.modelY = v / 100; },
            v => (v / 100).toFixed(2)
        );
        bind('modelDepthSlider', 'modelDepthValue',
            v => { this.renderer.modelDepth = v; }
        );
    }

    /**
     * Wire up stereo camera sliders
     */
    setupStereoControls() {
        const bind = (id, valId, transform, setter, format = v => v) => {
            const slider = document.getElementById(id);
            const display = document.getElementById(valId);
            if (!slider) return;
            const apply = () => {
                const raw = parseFloat(slider.value);
                const val = transform(raw);
                if (display) display.textContent = format(raw);
                setter(val);
            };
            slider.addEventListener('input', () => { apply(); this.draw(); });
            apply();
        };

        bind('eyeSeparationSlider', 'eyeSeparationValue',
            v => v / 100,
            v => { if (this.renderer.stereoCamera) this.renderer.stereoCamera.eyeSeparation = v; },
            v => (v / 100).toFixed(2)
        );
        bind('convergenceSlider', 'convergenceValue',
            v => v,
            v => { if (this.renderer.stereoCamera) this.renderer.stereoCamera.convergence = v; }
        );
        bind('fovSlider', 'fovValue',
            v => v * Math.PI / 180,
            v => { if (this.renderer.stereoCamera) this.renderer.stereoCamera.FOV = v; }
        );
        bind('nearSlider', 'nearValue',
            v => v,
            v => { if (this.renderer.stereoCamera) this.renderer.stereoCamera.nearClippingDistance = v; }
        );
    }

    async setupAudio() {
        const file = 'data/Пиріг_і_Батіг_-_Гаї_шумлять.mp3';
        await this.audio.load(file);

        const label = document.getElementById('audioFileName');
        if (label) label.textContent = file.split('/').pop();

        const playBtn = document.getElementById('audioPlayBtn');
        const restartBtn = document.getElementById('audioRestartBtn');

        const syncPlayBtn = () => {
            if (playBtn) playBtn.textContent = this.audio.isPlaying ? 'Pause' : 'Play';
        };

        if (playBtn) {
            playBtn.addEventListener('click', async () => {
                if (this.audio.isPlaying) await this.audio.pause();
                else await this.audio.play();
                syncPlayBtn();
            });
        }

        if (restartBtn) {
            restartBtn.addEventListener('click', async () => {
                await this.audio.restart();
                syncPlayBtn();
            });
        }

        const filterCheckbox = document.getElementById('filterEnabled');
        if (filterCheckbox) {
            filterCheckbox.addEventListener('change', () => {
                this.audio.setFilterEnabled(filterCheckbox.checked);
            });
        }
    }

    /**
     * Initialize and start the application
     */
    async initialize() {
        try {
            // Load shaders
            await this.loadShaders();
            await this.loadStereoShaders();

            // Initialize renderer state
            this.renderer.initializeState();

            // Create models
            this.createModels();

            // Load textures
            this.loadTextures();

            // Set up interaction
            this.setupTrackball();
            this.setupUIControls();
            this.setupStereoControls();
            this.setupModelPositionControls();
            this.setupWebcam();
            this.setupSensor();
            await this.setupAudio();

            // Start rendering
            this.startAnimation();

            console.log('Application initialized successfully');
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.displayError(error.message);
        }
    }

    /**
     * Display error message to user
     */
    displayError(message) {
        const holder = document.getElementById("canvas-holder");
        if (holder) {
            holder.innerHTML = `<p>Sorry, could not initialize the WebGL application: ${message}</p>`;
        }
    }

    /**
     * Cleanup and shutdown
     */
    shutdown() {
        this.renderer.cleanup();
    }
}

/**
 * Global initialization function
 */
async function init() {
    const app = new Application('webglcanvas');
    await app.initialize();

    // Store globally for potential debugging
    window.app = app;
}
