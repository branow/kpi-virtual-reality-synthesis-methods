#ifdef GL_FRAGMENT_PRECISION_HIGH
   precision highp float;
#else
   precision mediump float;
#endif

uniform vec4 color;
uniform bool bUseTexture;
uniform sampler2D iTMU0;

varying vec2 vTexCoord;

void main() {
    if (bUseTexture)
        gl_FragColor = texture2D(iTMU0, vTexCoord);
    else
        gl_FragColor = color;
}
