/**
 * ParametricSurface - Generates and renders a parametric surface with full texture mapping support
 */
class ParametricSurface extends BaseModel {
    constructor(gl, name, config) {
        super(gl, name);
        this.config = config;
        this.rSteps = config.defaultRSteps;
        this.uSteps = config.defaultUSteps;

        // Additional buffers for texture mapping
        this.uvBuffer = gl.createBuffer();
        this.tangentBuffer = gl.createBuffer();
        this.bitangentBuffer = gl.createBuffer();
    }

    /**
     * Update mesh density and regenerate surface
     * @param {number} rSteps - Radial steps
     * @param {number} uSteps - Angular steps
     */
    updateMeshDensity(rSteps, uSteps) {
        if (rSteps !== undefined) this.rSteps = rSteps;
        if (uSteps !== undefined) this.uSteps = uSteps;
        this.generateSurface();
    }

    /**
     * Generate complete surface data
     */
    generateSurface() {
        const vertices = this.generateVertices();
        const normals = this.generateNormals();
        const uvs = this.generateUVs();

        const tangentSpace = this.generateTangentSpace(normals);

        const indices = this.generateIndices();

        // Buffer all data to GPU
        this.bufferData(this.vertexBuffer, vertices, this.gl.ARRAY_BUFFER, this.gl.STREAM_DRAW);
        this.bufferData(this.normalBuffer, normals, this.gl.ARRAY_BUFFER, this.gl.STREAM_DRAW);
        this.bufferData(this.uvBuffer, uvs, this.gl.ARRAY_BUFFER, this.gl.STREAM_DRAW);
        this.bufferData(this.tangentBuffer, tangentSpace.tangents, this.gl.ARRAY_BUFFER, this.gl.STREAM_DRAW);
        this.bufferData(this.bitangentBuffer, tangentSpace.bitangents, this.gl.ARRAY_BUFFER, this.gl.STREAM_DRAW);
        this.bufferData(this.indexBuffer, indices, this.gl.ELEMENT_ARRAY_BUFFER, this.gl.STATIC_DRAW);

        this.count = indices.length;
    }

    /**
     * Generate vertex positions
     */
    generateVertices() {
        const vertices = [];
        const { rRange, uRange } = this.config;

        for (let i = 0; i <= this.rSteps; i++) {
            const r = rRange.min + (rRange.max - rRange.min) * (i / this.rSteps);
            for (let j = 0; j <= this.uSteps; j++) {
                const u = uRange.min + (uRange.max - uRange.min) * (j / this.uSteps);
                const point = SurfaceMath.surfacePoint(r, u, this.config);
                vertices.push(point.x, point.y, point.z);
            }
        }

        return new Float32Array(vertices);
    }

    /**
     * Generate UV texture coordinates
     */
    generateUVs() {
        const uvs = [];

        for (let i = 0; i <= this.rSteps; i++) {
            const v = i / this.rSteps;
            for (let j = 0; j <= this.uSteps; j++) {
                const u = j / this.uSteps;
                uvs.push(u, v);
            }
        }

        return new Float32Array(uvs);
    }

    /**
     * Generate tangent space vectors (tangent and bitangent) with proper Gram-Schmidt orthogonalization
     * Tangent is orthogonalized with respect to normal
     * Bitangent is calculated as cross product of normal and tangent
     * @param {Float32Array} normalsArray - Pre-calculated normals
     * @returns {{tangents: Float32Array, bitangents: Float32Array}} Orthogonalized tangent space
     */
    generateTangentSpace(normalsArray) {
        const tangents = [];
        const bitangents = [];
        const { rRange, uRange } = this.config;

        let normalIndex = 0;
        for (let i = 0; i <= this.rSteps; i++) {
            const r = rRange.min + (rRange.max - rRange.min) * (i / this.rSteps);
            for (let j = 0; j <= this.uSteps; j++) {
                const u = uRange.min + (uRange.max - uRange.min) * (j / this.uSteps);

                const T = SurfaceMath.surfaceTangent(r, u);

                const N = {
                    x: normalsArray[normalIndex * 3],
                    y: normalsArray[normalIndex * 3 + 1],
                    z: normalsArray[normalIndex * 3 + 2]
                };

                const { tangent, bitangent } = SurfaceMath.orthogonalizeTangentSpace(T, N);

                tangents.push(tangent.x, tangent.y, tangent.z);
                bitangents.push(bitangent.x, bitangent.y, bitangent.z);

                normalIndex++;
            }
        }

        return {
            tangents: new Float32Array(tangents),
            bitangents: new Float32Array(bitangents)
        };
    }

    /**
     * Generate vertex normals using angle-weighted averaging
     */
    generateNormals() {
        const { rRange, uRange } = this.config;
        const cols = this.uSteps + 1;

        // Generate all vertices first
        const vertices = [];
        for (let i = 0; i <= this.rSteps; i++) {
            const r = rRange.min + (rRange.max - rRange.min) * (i / this.rSteps);
            for (let j = 0; j <= this.uSteps; j++) {
                const u = uRange.min + (uRange.max - uRange.min) * (j / this.uSteps);
                vertices.push(SurfaceMath.surfacePoint(r, u, this.config));
            }
        }

        // Initialize normals to zero
        const normals = new Array((this.rSteps + 1) * (this.uSteps + 1));
        for (let i = 0; i < normals.length; i++) {
            normals[i] = { x: 0, y: 0, z: 0 };
        }

        // Accumulate face normals weighted by vertex angle
        for (let i = 0; i < this.rSteps; i++) {
            for (let j = 0; j < this.uSteps; j++) {
                const idx0 = i * cols + j;
                const idx1 = i * cols + (j + 1);
                const idx2 = (i + 1) * cols + (j + 1);
                const idx3 = (i + 1) * cols + j;

                const v0 = vertices[idx0];
                const v1 = vertices[idx1];
                const v2 = vertices[idx2];
                const v3 = vertices[idx3];

                this.accumulateTriangleNormal(normals, idx0, idx1, idx2, v0, v1, v2);
                this.accumulateTriangleNormal(normals, idx0, idx2, idx3, v0, v2, v3);
            }
        }

        // Normalize all vertex normals
        const normalArray = [];
        for (let i = 0; i < normals.length; i++) {
            const normalized = SurfaceMath.normalize(normals[i]);
            normalArray.push(normalized.x, normalized.y, normalized.z);
        }

        return new Float32Array(normalArray);
    }

    /**
     * Accumulate weighted normal for a triangle
     */
    accumulateTriangleNormal(normals, idx0, idx1, idx2, v0, v1, v2) {
        const edge1 = SurfaceMath.subtract(v1, v0);
        const edge2 = SurfaceMath.subtract(v2, v0);
        const faceNormal = SurfaceMath.normalize(SurfaceMath.crossProduct(edge1, edge2));

        // Calculate angles at each vertex
        const angle0 = SurfaceMath.calculateAngle(v1, v0, v2);
        const angle1 = SurfaceMath.calculateAngle(v0, v1, v2);
        const angle2 = SurfaceMath.calculateAngle(v0, v2, v1);

        // Add weighted normal to each vertex
        normals[idx0].x += faceNormal.x * angle0;
        normals[idx0].y += faceNormal.y * angle0;
        normals[idx0].z += faceNormal.z * angle0;

        normals[idx1].x += faceNormal.x * angle1;
        normals[idx1].y += faceNormal.y * angle1;
        normals[idx1].z += faceNormal.z * angle1;

        normals[idx2].x += faceNormal.x * angle2;
        normals[idx2].y += faceNormal.y * angle2;
        normals[idx2].z += faceNormal.z * angle2;
    }

    /**
     * Generate triangle indices
     */
    generateIndices() {
        const indices = [];
        const cols = this.uSteps + 1;

        for (let i = 0; i < this.rSteps; i++) {
            for (let j = 0; j < this.uSteps; j++) {
                const p0 = i * cols + j;
                const p1 = i * cols + (j + 1);
                const p2 = (i + 1) * cols + (j + 1);
                const p3 = (i + 1) * cols + j;

                // Two triangles per quad
                indices.push(p0, p1, p2);
                indices.push(p0, p2, p3);
            }
        }

        return new Uint16Array(indices);
    }

    /**
     * Draw the surface
     */
    draw(shaderProgram) {
        this.bindAttribute(shaderProgram.iAttribVertex, this.vertexBuffer, 3);
        this.bindAttribute(shaderProgram.iAttribNormal, this.normalBuffer, 3);
        this.bindAttribute(shaderProgram.iAttribTexCoord, this.uvBuffer, 2);
        this.bindAttribute(shaderProgram.iAttribTangent, this.tangentBuffer, 3);
        this.bindAttribute(shaderProgram.iAttribBitangent, this.bitangentBuffer, 3);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.gl.drawElements(this.gl.TRIANGLES, this.count, this.gl.UNSIGNED_SHORT, 0);
    }

    /**
     * Draw the surface with simple stereo shader (position + texcoords only)
     */
    drawStereo(shaderProgram) {
        this.bindAttribute(shaderProgram.iAttribVertex, this.vertexBuffer, 3);
        this.bindAttribute(shaderProgram.iAttribTexCoords, this.uvBuffer, 2);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.gl.drawElements(this.gl.TRIANGLES, this.count, this.gl.UNSIGNED_SHORT, 0);
    }

    /**
     * Draw wireframe with simple stereo shader
     */
    drawWireframeStereo(shaderProgram) {
        this.bindAttribute(shaderProgram.iAttribVertex, this.vertexBuffer, 3);
        this.bindAttribute(shaderProgram.iAttribTexCoords, this.uvBuffer, 2);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        for (let p = 0; p < this.count; p += 3)
            this.gl.drawElements(this.gl.LINE_LOOP, 3, this.gl.UNSIGNED_SHORT, p * 2);
    }
}
