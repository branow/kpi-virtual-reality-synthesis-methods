/**
 * A-Frame component that builds the parametric surface as a three.js
 * BufferGeometry and attaches it to its host entity.
 *
 * Uses SurfaceConfig (parameters) and SurfaceMath.surfacePoint (formula)
 * preserved from the PA#1 codebase, so the shape matches PA#1 exactly.
 */
AFRAME.registerComponent('parametric-surface', {
    schema: {
        rSteps: { default: 50 },
        uSteps: { default: 100 }
    },

    init: function () {
        const geometry = this.buildGeometry(this.data.rSteps, this.data.uSteps);

        // Load PA#1 textures. Three.js asynchronously fills these in;
        // the material auto-rerenders once each one arrives.
        const loader = new THREE.TextureLoader();
        const material = new THREE.MeshStandardMaterial({
            map:         loader.load('textures/diffuse.jpg'),
            normalMap:   loader.load('textures/normal.jpg'),
            roughnessMap: loader.load('textures/specular.jpg'),
            metalness: 0.1,
            roughness: 0.6,
            side: THREE.DoubleSide
        });

        const mesh = new THREE.Mesh(geometry, material);
        this.el.setObject3D('mesh', mesh);
    },

    buildGeometry: function (rSteps, uSteps) {
        const config = SurfaceConfig;
        const positions = [];
        const uvs = [];
        const indices = [];

        for (let i = 0; i <= rSteps; i++) {
            const r = config.rRange.min +
                (config.rRange.max - config.rRange.min) * (i / rSteps);
            for (let j = 0; j <= uSteps; j++) {
                const u = config.uRange.min +
                    (config.uRange.max - config.uRange.min) * (j / uSteps);
                const p = SurfaceMath.surfacePoint(r, u, config);
                positions.push(p.x, p.y, p.z);
                uvs.push(j / uSteps, i / rSteps);
            }
        }

        const cols = uSteps + 1;
        for (let i = 0; i < rSteps; i++) {
            for (let j = 0; j < uSteps; j++) {
                const p0 = i * cols + j;
                const p1 = i * cols + (j + 1);
                const p2 = (i + 1) * cols + (j + 1);
                const p3 = (i + 1) * cols + j;
                indices.push(p0, p1, p2, p0, p2, p3);
            }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geo.setIndex(indices);
        geo.computeVertexNormals();
        return geo;
    }
});
