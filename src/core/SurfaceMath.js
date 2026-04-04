/**
 * SurfaceMath - Mathematical utilities for parametric surface generation
 */
class SurfaceMath {
    /**
     * Calculate a point on the parametric surface
     * @param {number} r - Radial parameter
     * @param {number} u - Angular parameter
     * @param {object} config - Surface configuration
     * @returns {{x: number, y: number, z: number}} Point on surface
     */
    static surfacePoint(r, u, config) {
        const { a, n, w, f } = config;
        const x = r * Math.cos(u);
        const y = r * Math.sin(u);
        const z = a * Math.exp(-n * r) * Math.sin(w * r + f);
        return { x, y, z };
    }

    /**
     * Calculate tangent vector (∂P/∂u) at a point
     * @param {number} r - Radial parameter
     * @param {number} u - Angular parameter
     * @returns {{x: number, y: number, z: number}} Tangent vector
     */
    static surfaceTangent(r, u) {
        const x = -r * Math.sin(u);
        const y = r * Math.cos(u);
        const z = 0;
        return { x, y, z };
    }

    /**
     * Calculate bitangent vector (∂P/∂r) at a point
     * @param {number} r - Radial parameter
     * @param {number} u - Angular parameter
     * @param {object} config - Surface configuration
     * @returns {{x: number, y: number, z: number}} Bitangent vector
     */
    static surfaceBitangent(r, u, config) {
        const { a, n, w, f } = config;
        const expTerm = Math.exp(-n * r);
        const sinTerm = Math.sin(w * r + f);
        const cosTerm = Math.cos(w * r + f);

        const x = Math.cos(u);
        const y = Math.sin(u);
        const z = a * expTerm * (-n * sinTerm + w * cosTerm);
        return { x, y, z };
    }

    /**
     * Vector operations
     */
    static dot(v1, v2) {
        return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
    }

    static length(v) {
        return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    }

    static normalize(v) {
        const len = this.length(v);
        if (len > 0.00001) {
            return { x: v.x / len, y: v.y / len, z: v.z / len };
        }
        return { x: 0, y: 0, z: 1 };
    }

    static subtract(v1, v2) {
        return {
            x: v1.x - v2.x,
            y: v1.y - v2.y,
            z: v1.z - v2.z
        };
    }

    static crossProduct(v1, v2) {
        return {
            x: v1.y * v2.z - v1.z * v2.y,
            y: v1.z * v2.x - v1.x * v2.z,
            z: v1.x * v2.y - v1.y * v2.x
        };
    }

    /**
     * Calculate angle at a vertex given three points
     * @param {object} v1 - First point
     * @param {object} vCenter - Center vertex
     * @param {object} v2 - Second point
     * @returns {number} Angle in radians
     */
    static calculateAngle(v1, vCenter, v2) {
        const edge1 = this.subtract(v1, vCenter);
        const edge2 = this.subtract(v2, vCenter);

        const len1 = this.length(edge1);
        const len2 = this.length(edge2);

        if (len1 < 0.00001 || len2 < 0.00001) {
            return 0;
        }

        const cosAngle = this.dot(edge1, edge2) / (len1 * len2);
        const clampedCos = Math.max(-1, Math.min(1, cosAngle));
        return Math.acos(clampedCos);
    }

    /**
     * Apply Gram-Schmidt orthogonalization to create orthonormal tangent space
     * Normal has priority and remains unchanged
     * Tangent is orthogonalized with respect to normal
     * Bitangent is calculated as cross product of normal and tangent
     * @param {object} T - Tangent vector
     * @param {object} N - Normal vector
     * @returns {{tangent: object, bitangent: object}} Orthogonalized vectors
     */
    static orthogonalizeTangentSpace(T, N) {
        // Normalize normal (normal has priority)
        const N_normalized = this.normalize(N);

        // Orthogonalize tangent with respect to normal using Gram-Schmidt
        // T' = T - (T·N)N
        const dotTN = this.dot(T, N_normalized);
        const projection = {
            x: N_normalized.x * dotTN,
            y: N_normalized.y * dotTN,
            z: N_normalized.z * dotTN
        };
        const T_ortho = this.subtract(T, projection);
        const T_normalized = this.normalize(T_ortho);

        // Calculate bitangent as cross product: B = N × T
        const B_ortho = this.crossProduct(N_normalized, T_normalized);
        const B_normalized = this.normalize(B_ortho);

        return {
            tangent: T_normalized,
            bitangent: B_normalized
        };
    }
}
