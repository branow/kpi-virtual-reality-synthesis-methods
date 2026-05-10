/**
 * SurfaceMath - Parametric surface formula from PA#1.
 *
 *   x = r * cos(u)
 *   y = r * sin(u)
 *   z = a * exp(-n * r) * sin(w * r + f)
 */
class SurfaceMath {
    static surfacePoint(r, u, config) {
        const { a, n, w, f } = config;
        const x = r * Math.cos(u);
        const y = r * Math.sin(u);
        const z = a * Math.exp(-n * r) * Math.sin(w * r + f);
        return { x, y, z };
    }
}
