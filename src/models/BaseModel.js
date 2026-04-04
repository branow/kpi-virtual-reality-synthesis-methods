/**
 * BaseModel - Base class for all 3D models
 */
class BaseModel {
    constructor(gl, name) {
        this.gl = gl;
        this.name = name;
        this.vertexBuffer = gl.createBuffer();
        this.normalBuffer = gl.createBuffer();
        this.indexBuffer = gl.createBuffer();
        this.count = 0;
    }

    /**
     * Bind vertex attribute to shader
     * @param {number} location - Attribute location
     * @param {WebGLBuffer} buffer - Buffer to bind
     * @param {number} size - Number of components per vertex
     */
    bindAttribute(location, buffer, size) {
        if (location === -1) return;

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.vertexAttribPointer(location, size, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(location);
    }

    /**
     * Buffer data to GPU
     * @param {WebGLBuffer} buffer - Target buffer
     * @param {Float32Array|Uint16Array} data - Data to buffer
     * @param {number} target - Buffer target (ARRAY_BUFFER or ELEMENT_ARRAY_BUFFER)
     * @param {number} usage - Usage hint
     */
    bufferData(buffer, data, target, usage) {
        this.gl.bindBuffer(target, buffer);
        this.gl.bufferData(target, data, usage);
    }

    /**
     * Draw the model - to be implemented by subclasses
     * @param {object} shaderProgram - Shader program with attribute locations
     */
    draw(shaderProgram) {
        throw new Error('draw() must be implemented by subclass');
    }
}
