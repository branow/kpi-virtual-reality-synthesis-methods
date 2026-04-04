attribute vec3 vertex;
attribute vec2 tex;
uniform mat4 ModelViewMatrix;
uniform mat4 ProjectionMatrix;

varying vec2 vTexCoord;

void main() {
    vTexCoord = tex;
    gl_Position = ProjectionMatrix * ModelViewMatrix * vec4(vertex, 1.0);
}
