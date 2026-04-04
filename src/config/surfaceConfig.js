/**
 * Surface configuration parameters
 */
const SurfaceConfig = {
    // Parametric surface equation parameters
    // x = r * cos(u)
    // y = r * sin(u)
    // z = a * exp(-n * r) * sin(w * r + f)
    m: 0.5,
    get b() { return 3 * this.m; },
    get a() { return 2 * this.m; },
    n: 0.5,
    w: 10,
    f: 0,

    // Default mesh density
    defaultRSteps: 50,
    defaultUSteps: 100,

    // Parameter ranges
    rRange: { min: 0, get max() { return SurfaceConfig.b; } },
    uRange: { min: 0, max: Math.PI * 2 }
};
