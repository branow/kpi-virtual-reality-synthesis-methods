/**
 * Renderer - Handles WebGL rendering operations
 */
class Renderer {
    constructor(gl, canvas) {
        this.gl = gl;
        this.canvas = canvas;
        this.shaderProgram = null;
        this.textureManager = new TextureManager(gl);
        this.models = new Map();
        this.animationId = null;
        this.lightAngle = 0;
        this.modelX = 0;
        this.modelY = 0;
        this.modelDepth = 10;

        // Stereo rendering
        this.stereoShaderProg = null;
        this.stereoCamera = null;
        this.webcamTexture = null;
        this.webcamVideo = null;
        this.webcamQuadVBuffer = null;
        this.webcamQuadTBuffer = null;
        this.webcamQuadIBuffer = null;
    }

    /**
     * Set the shader program
     */
    setShaderProgram(program) {
        this.shaderProgram = this.createShaderProgramWrapper(program);
        this.gl.useProgram(program);
    }

    /**
     * Create a wrapper object for shader program with uniform/attribute locations
     */
    createShaderProgramWrapper(program) {
        return {
            prog: program,
            // Attributes
            iAttribVertex: this.gl.getAttribLocation(program, "vertex"),
            iAttribNormal: this.gl.getAttribLocation(program, "normal"),
            iAttribTexCoord: this.gl.getAttribLocation(program, "texCoord"),
            iAttribTangent: this.gl.getAttribLocation(program, "tangent"),
            iAttribBitangent: this.gl.getAttribLocation(program, "bitangent"),
            // Uniforms - Matrices
            iModelViewProjectionMatrix: this.gl.getUniformLocation(program, "ModelViewProjectionMatrix"),
            iModelViewMatrix: this.gl.getUniformLocation(program, "ModelViewMatrix"),
            iNormalMatrix: this.gl.getUniformLocation(program, "NormalMatrix"),
            // Uniforms - Lighting
            iLightPosition: this.gl.getUniformLocation(program, "lightPosition"),
            iAmbientColor: this.gl.getUniformLocation(program, "ambientColor"),
            iDiffuseColor: this.gl.getUniformLocation(program, "diffuseColor"),
            iSpecularColor: this.gl.getUniformLocation(program, "specularColor"),
            iShininess: this.gl.getUniformLocation(program, "shininess"),
            // Uniforms - Textures
            iDiffuseMap: this.gl.getUniformLocation(program, "diffuseMap"),
            iSpecularMap: this.gl.getUniformLocation(program, "specularMap"),
            iNormalMap: this.gl.getUniformLocation(program, "normalMap")
        };
    }

    /**
     * Add a model to the renderer
     */
    addModel(name, model) {
        this.models.set(name, model);
    }

    /**
     * Get a model by name
     */
    getModel(name) {
        return this.models.get(name);
    }

    /**
     * Clear the screen
     */
    clear() {
        this.gl.clearColor(0.5, 0.5, 0.5, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }

    /**
     * Set up view and projection matrices
     */
    setupMatrices(viewMatrix) {
        const projection = m4.perspective(Math.PI / 8, 1, 8, 12);

        const rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
        const scaleMatrix = m4.scaling(0.7, 0.7, 0.7);
        const translateToPointZero = m4.translation(0, 0, -10);

        const matAccum0 = m4.multiply(rotateToPointZero, viewMatrix);
        const matAccum0_5 = m4.multiply(scaleMatrix, matAccum0);
        const matAccum1 = m4.multiply(translateToPointZero, matAccum0_5);
        const matAccum1_noScale = m4.multiply(translateToPointZero, matAccum0);

        const modelViewProjection = m4.multiply(projection, matAccum1);
        const normalMatrix = m4.transpose(m4.inverse(matAccum1));

        return {
            modelViewProjection,
            modelView: matAccum1,
            normalMatrix,
            matAccum1_noScale
        };
    }

    /**
     * Calculate light position
     */
    calculateLightPosition(matrices) {
        const lightRadius = 1.5;
        const lightWorldX = lightRadius * Math.cos(this.lightAngle);
        const lightWorldY = lightRadius * Math.sin(this.lightAngle);
        const lightWorldZ = 3;

        const lightWorldPos = [lightWorldX, lightWorldY, lightWorldZ, 1.0];
        const lightViewPos = m4.transformVector(matrices.matAccum1_noScale, lightWorldPos);

        return [lightViewPos[0], lightViewPos[1], lightViewPos[2]];
    }

    /**
     * Set shader uniforms
     */
    setUniforms(matrices, lightPosition) {
        const { shaderProgram: sp } = this;

        // Matrices
        this.gl.uniformMatrix4fv(sp.iModelViewProjectionMatrix, false, matrices.modelViewProjection);
        this.gl.uniformMatrix4fv(sp.iModelViewMatrix, false, matrices.modelView);
        this.gl.uniformMatrix4fv(sp.iNormalMatrix, false, matrices.normalMatrix);

        // Light
        this.gl.uniform3fv(sp.iLightPosition, lightPosition);

        // Material properties
        this.gl.uniform3fv(sp.iAmbientColor, [0.6, 0.6, 0.6]);
        this.gl.uniform3fv(sp.iDiffuseColor, [1.5, 1.5, 1.5]);
        this.gl.uniform3fv(sp.iSpecularColor, [1.0, 1.0, 1.0]);
        this.gl.uniform1f(sp.iShininess, 16.0);

    }

    /**
     * Bind textures for rendering
     */
    bindTextures() {
        this.textureManager.bindTexture('diffuse', 0);
        this.gl.uniform1i(this.shaderProgram.iDiffuseMap, 0);

        this.textureManager.bindTexture('specular', 1);
        this.gl.uniform1i(this.shaderProgram.iSpecularMap, 1);

        this.textureManager.bindTexture('normal', 2);
        this.gl.uniform1i(this.shaderProgram.iNormalMap, 2);
    }

    /**
     * Render a single frame
     */
    render(viewMatrix) {
        this.clear();

        const matrices = this.setupMatrices(viewMatrix);
        const lightPosition = this.calculateLightPosition(matrices);

        this.setUniforms(matrices, lightPosition);
        this.bindTextures();

        // Draw the surface
        const surface = this.models.get('surface');
        if (surface) {
            surface.draw(this.shaderProgram);
        }
    }

    /**
     * Update light angle for animation
     */
    updateLightAngle() {
        this.lightAngle += 0.02;
        if (this.lightAngle > Math.PI * 2) {
            this.lightAngle -= Math.PI * 2;
        }
    }

    /**
     * Start animation loop
     */
    startAnimation(drawCallback) {
        const animate = () => {
            this.updateLightAngle();
            drawCallback();
            this.animationId = requestAnimationFrame(animate);
        };
        animate();
    }

    /**
     * Stop animation
     */
    stopAnimation() {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Initialize WebGL state
     */
    initializeState() {
        this.gl.enable(this.gl.DEPTH_TEST);
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.stopAnimation();
        this.textureManager.cleanup();
        this.models.clear();
    }

    /**
     * Set and cache the stereo shader program with uniform/attribute locations
     */
    setStereoShaderProgram(program) {
        const gl = this.gl;
        this.stereoShaderProg = {
            prog: program,
            iAttribVertex:   gl.getAttribLocation(program, 'vertex'),
            iAttribTexCoords: gl.getAttribLocation(program, 'tex'),
            iModelViewMatrix:  gl.getUniformLocation(program, 'ModelViewMatrix'),
            iProjectionMatrix: gl.getUniformLocation(program, 'ProjectionMatrix'),
            iColor:      gl.getUniformLocation(program, 'color'),
            bUseTexture: gl.getUniformLocation(program, 'bUseTexture'),
            iTMU0:       gl.getUniformLocation(program, 'iTMU0'),
        };
    }

    /**
     * Create default StereoCamera
     */
    initStereoCamera() {
        this.stereoCamera = new StereoCamera(
            0.7,   // eyeSeparation
            14.0,  // convergence
            1.33,   // aspectRatio
            0.4,   // FOV radians
            8.0,   // nearClippingDistance
            20.0   // farClippingDistance
        );
    }

    /**
     * Create a full-screen quad geometry for webcam background
     */
    initWebcamQuad() {
        const gl = this.gl;

        const vertices = new Float32Array([
            0, 0, -9,
            1, 0, -9,
            1, 1, -9,
            0, 1, -9,
        ]);
        // y-flipped texcoords so video appears right-side up
        const texcoords = new Float32Array([
            0, 1,
            1, 1,
            1, 0,
            0, 0,
        ]);
        const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

        this.webcamQuadVBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.webcamQuadVBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        this.webcamQuadTBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.webcamQuadTBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texcoords, gl.STATIC_DRAW);

        this.webcamQuadIBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.webcamQuadIBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    }

    /**
     * Create a WebGL texture for webcam frames
     */
    createWebcamTexture(width, height) {
        const gl = this.gl;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        this.webcamTexture = tex;
    }

    /**
     * Store reference to the webcam video element
     */
    setWebcamVideo(video) {
        this.webcamVideo = video;
    }

    /**
     * Draw the full-screen webcam quad
     */
    drawWebcamQuad() {
        const gl = this.gl;
        const sp = this.stereoShaderProg;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.webcamQuadVBuffer);
        gl.vertexAttribPointer(sp.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(sp.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.webcamQuadTBuffer);
        gl.vertexAttribPointer(sp.iAttribTexCoords, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(sp.iAttribTexCoords);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.webcamQuadIBuffer);
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    /**
     * Render one anaglyphic stereo frame
     */
    renderStereo(viewMatrix) {
        const gl = this.gl;
        const sp = this.stereoShaderProg;

        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(sp.prog);
        gl.uniform1i(sp.iTMU0, 0);

        // Draw webcam background (zero parallax, no depth write)
        if (this.webcamTexture && this.webcamVideo && this.webcamVideo.readyState >= 2) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.webcamTexture);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, this.webcamVideo);

            const matrOrth = m4.orthographic(0, 1, 0, 1, 8, 20);
            gl.uniformMatrix4fv(sp.iProjectionMatrix, false, matrOrth);

            const identityMV = m4.translation(0, 0, 0);
            gl.uniformMatrix4fv(sp.iModelViewMatrix, false, identityMV);

            gl.uniform1i(sp.bUseTexture, 1);
            gl.depthMask(false);
            this.drawWebcamQuad();
            gl.depthMask(true);
        }

        const surface = this.models.get('surface');
        if (!surface) return;

        gl.uniform1i(sp.bUseTexture, 0);

        const rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
        const scaleMatrix = m4.scaling(0.7, 0.7, 0.7);
        const translateToPointZero = m4.translation(this.modelX, this.modelY, -this.modelDepth);

        const colorPolygon = new Float32Array([0.5, 0.5, 0.5, 1]);
        const colorEdge    = new Float32Array([1.0, 1.0, 1.0, 1]);

        // Base model-view without eye translation
        const matBase0 = m4.multiply(rotateToPointZero, viewMatrix);
        const matBase1 = m4.multiply(scaleMatrix, matBase0);

        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(1, 0);

        // Left eye (red channel)
        const matrLeft = this.stereoCamera.calcLeftFrustum();
        gl.uniformMatrix4fv(sp.iProjectionMatrix, false, matrLeft);

        const matLeft = m4.multiply(
            translateToPointZero,
            m4.multiply(m4.translation(this.stereoCamera.eyeSeparation / 2, 0, 0), matBase1)
        );
        gl.uniformMatrix4fv(sp.iModelViewMatrix, false, matLeft);

        gl.colorMask(true, false, false, true);
        gl.uniform4fv(sp.iColor, colorPolygon);
        surface.drawStereo(sp);
        gl.uniform4fv(sp.iColor, colorEdge);
        surface.drawWireframeStereo(sp);

        // Clear depth between eyes
        gl.clear(gl.DEPTH_BUFFER_BIT);

        // Right eye (cyan channels)
        const matrRight = this.stereoCamera.calcRightFrustum();
        gl.uniformMatrix4fv(sp.iProjectionMatrix, false, matrRight);

        const matRight = m4.multiply(
            translateToPointZero,
            m4.multiply(m4.translation(-this.stereoCamera.eyeSeparation / 2, 0, 0), matBase1)
        );
        gl.uniformMatrix4fv(sp.iModelViewMatrix, false, matRight);

        gl.colorMask(false, true, true, true);
        gl.uniform4fv(sp.iColor, colorPolygon);
        surface.drawStereo(sp);
        gl.uniform4fv(sp.iColor, colorEdge);
        surface.drawWireframeStereo(sp);

        gl.disable(gl.POLYGON_OFFSET_FILL);
        gl.colorMask(true, true, true, true);
    }
}
