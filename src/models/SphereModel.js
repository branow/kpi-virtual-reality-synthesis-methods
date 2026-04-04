/**
 * SphereModel - Generates and renders a sphere
 */
class SphereModel extends BaseModel {
    constructor(gl, name) {
        super(gl, name);
    }

    /**
     * Generate sphere data
     * @param {number} radius - Sphere radius
     * @param {number} latitudeBands - Number of latitude divisions
     * @param {number} longitudeBands - Number of longitude divisions
     */
    generate(radius, latitudeBands, longitudeBands) {
        const { vertices, normals, indices } = this.generateSphereData(
            radius,
            latitudeBands,
            longitudeBands
        );

        this.bufferData(this.vertexBuffer, vertices, this.gl.ARRAY_BUFFER, this.gl.STATIC_DRAW);
        this.bufferData(this.normalBuffer, normals, this.gl.ARRAY_BUFFER, this.gl.STATIC_DRAW);
        this.bufferData(this.indexBuffer, indices, this.gl.ELEMENT_ARRAY_BUFFER, this.gl.STATIC_DRAW);

        this.count = indices.length;
    }

    /**
     * Generate sphere geometry data
     */
    generateSphereData(radius, latitudeBands, longitudeBands) {
        const vertices = [];
        const normals = [];
        const indices = [];

        // Generate vertices and normals
        for (let lat = 0; lat <= latitudeBands; lat++) {
            const theta = lat * Math.PI / latitudeBands;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            for (let lon = 0; lon <= longitudeBands; lon++) {
                const phi = lon * 2 * Math.PI / longitudeBands;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);

                const x = cosPhi * sinTheta;
                const y = cosTheta;
                const z = sinPhi * sinTheta;

                vertices.push(radius * x, radius * y, radius * z);
                normals.push(x, y, z);
            }
        }

        // Generate indices
        for (let lat = 0; lat < latitudeBands; lat++) {
            for (let lon = 0; lon < longitudeBands; lon++) {
                const first = lat * (longitudeBands + 1) + lon;
                const second = first + longitudeBands + 1;

                indices.push(first, second, first + 1);
                indices.push(second, second + 1, first + 1);
            }
        }

        return {
            vertices: new Float32Array(vertices),
            normals: new Float32Array(normals),
            indices: new Uint16Array(indices)
        };
    }

    /**
     * Draw the sphere
     */
    draw(shaderProgram) {
        this.bindAttribute(shaderProgram.iAttribVertex, this.vertexBuffer, 3);
        this.bindAttribute(shaderProgram.iAttribNormal, this.normalBuffer, 3);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.gl.drawElements(this.gl.TRIANGLES, this.count, this.gl.UNSIGNED_SHORT, 0);
    }
}
