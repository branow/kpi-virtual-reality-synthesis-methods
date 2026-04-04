/**
 * TextureManager - Handles texture loading and management
 */
class TextureManager {
    constructor(gl) {
        this.gl = gl;
        this.textures = new Map();
    }

    /**
     * Check if a value is a power of 2
     */
    static isPowerOf2(value) {
        return (value & (value - 1)) === 0;
    }

    /**
     * Create a solid color texture
     * @param {string} name - Texture name for caching
     * @param {number} r - Red component (0-255)
     * @param {number} g - Green component (0-255)
     * @param {number} b - Blue component (0-255)
     * @param {number} a - Alpha component (0-255)
     * @returns {WebGLTexture} Created texture
     */
    createSolidTexture(name, r, g, b, a) {
        const texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

        const pixel = new Uint8Array([r, g, b, a]);
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.RGBA,
            1,
            1,
            0,
            this.gl.RGBA,
            this.gl.UNSIGNED_BYTE,
            pixel
        );

        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

        this.textures.set(name, texture);
        return texture;
    }

    /**
     * Load texture from URL
     * @param {string} name - Texture name for caching
     * @param {string} url - Image URL
     * @param {Function} callback - Callback function when texture is loaded
     * @returns {WebGLTexture} Created texture (with placeholder until image loads)
     */
    loadTexture(name, url, callback) {
        const texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

        // Create placeholder pixel (light blue for normal maps)
        const pixel = new Uint8Array([128, 128, 255, 255]);
        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0,
            this.gl.RGBA,
            1,
            1,
            0,
            this.gl.RGBA,
            this.gl.UNSIGNED_BYTE,
            pixel
        );

        // Load actual image
        const image = new Image();
        image.onload = () => {
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
            this.gl.texImage2D(
                this.gl.TEXTURE_2D,
                0,
                this.gl.RGBA,
                this.gl.RGBA,
                this.gl.UNSIGNED_BYTE,
                image
            );

            // Set texture parameters based on image size
            if (TextureManager.isPowerOf2(image.width) && TextureManager.isPowerOf2(image.height)) {
                this.gl.generateMipmap(this.gl.TEXTURE_2D);
                this.gl.texParameteri(
                    this.gl.TEXTURE_2D,
                    this.gl.TEXTURE_MIN_FILTER,
                    this.gl.LINEAR_MIPMAP_LINEAR
                );
            } else {
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
                this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            }
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

            if (callback) callback();
        };

        image.onerror = () => {
            console.error(`Failed to load texture: ${url}`);
        };

        image.src = url;

        this.textures.set(name, texture);
        return texture;
    }

    /**
     * Get a texture by name
     * @param {string} name - Texture name
     * @returns {WebGLTexture|null} The texture or null if not found
     */
    getTexture(name) {
        return this.textures.get(name) || null;
    }

    /**
     * Bind a texture to a specific texture unit
     * @param {string} name - Texture name
     * @param {number} unit - Texture unit (0-31)
     */
    bindTexture(name, unit) {
        const texture = this.getTexture(name);
        if (texture) {
            this.gl.activeTexture(this.gl.TEXTURE0 + unit);
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        }
    }

    /**
     * Delete all textures
     */
    cleanup() {
        this.textures.forEach(texture => {
            this.gl.deleteTexture(texture);
        });
        this.textures.clear();
    }
}
