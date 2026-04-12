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
        const viewMatrix = this.sensorMatrix || this.trackball.getViewMatrix();
        if (this.renderer.stereoShaderProg) {
            this.renderer.renderStereo(viewMatrix);
        } else {
            this.renderer.render(viewMatrix);
        }
    }

    /**
     * Start the animation loop
     */
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
        this.sensor = new SensorConnection(
            (matrix) => {
                this.sensorMatrix = matrix;
            },
            (status) => {
                const el = document.getElementById('sensorStatus');
                if (el) el.textContent = status;
            }
        );

        const connectBtn = document.getElementById('sensorConnectBtn');
        const hostInput  = document.getElementById('sensorHost');
        const portInput  = document.getElementById('sensorPort');

        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                if (this.sensor.isConnected()) {
                    this.sensor.disconnect();
                    this.sensorMatrix = null;
                    connectBtn.textContent = 'Connect';
                } else {
                    const host = hostInput ? hostInput.value.trim() : '192.168.0.101';
                    const port = portInput ? parseInt(portInput.value) : 8080;
                    this.sensor.connect(host, port);
                    connectBtn.textContent = 'Disconnect';
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
            slider.addEventListener('input', () => {
                const raw = parseFloat(slider.value);
                const val = transform(raw);
                if (display) display.textContent = format(raw);
                setter(val);
                this.draw();
            });
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
