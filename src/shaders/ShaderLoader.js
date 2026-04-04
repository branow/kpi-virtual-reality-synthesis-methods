/**
 * ShaderLoader - Handles loading and compiling GLSL shaders
 */
class ShaderLoader {
    /**
     * Load shader source from a file
     * @param {string} url - Path to the shader file
     * @returns {Promise<string>} Shader source code
     */
    static async loadShaderSource(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load shader: ${url}`);
        }
        return await response.text();
    }

    /**
     * Compile a shader
     * @param {WebGLRenderingContext} gl - WebGL context
     * @param {string} source - Shader source code
     * @param {number} type - Shader type (gl.VERTEX_SHADER or gl.FRAGMENT_SHADER)
     * @returns {WebGLShader} Compiled shader
     */
    static compileShader(gl, source, type) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error(`Shader compilation error: ${info}`);
        }

        return shader;
    }

    /**
     * Create and link a shader program
     * @param {WebGLRenderingContext} gl - WebGL context
     * @param {string} vertexSource - Vertex shader source
     * @param {string} fragmentSource - Fragment shader source
     * @returns {WebGLProgram} Linked shader program
     */
    static createProgram(gl, vertexSource, fragmentSource) {
        const vertexShader = this.compileShader(gl, vertexSource, gl.VERTEX_SHADER);
        const fragmentShader = this.compileShader(gl, fragmentSource, gl.FRAGMENT_SHADER);

        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            throw new Error(`Program linking error: ${info}`);
        }

        return program;
    }

    /**
     * Load shaders from files and create program
     * @param {WebGLRenderingContext} gl - WebGL context
     * @param {string} vertexPath - Path to vertex shader
     * @param {string} fragmentPath - Path to fragment shader
     * @returns {Promise<WebGLProgram>} Linked shader program
     */
    static async loadProgram(gl, vertexPath, fragmentPath) {
        const [vertexSource, fragmentSource] = await Promise.all([
            this.loadShaderSource(vertexPath),
            this.loadShaderSource(fragmentPath)
        ]);

        return this.createProgram(gl, vertexSource, fragmentSource);
    }
}
