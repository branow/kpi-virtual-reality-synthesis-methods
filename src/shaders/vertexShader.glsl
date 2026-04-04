attribute vec3 vertex;
attribute vec3 normal;
attribute vec2 texCoord;
attribute vec3 tangent;
attribute vec3 bitangent;

uniform mat4 ModelViewProjectionMatrix;
uniform mat4 ModelViewMatrix;
uniform mat4 NormalMatrix;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vTexCoord;
varying vec3 vTangent;
varying vec3 vBitangent;

void main() {
    vec4 position = ModelViewMatrix * vec4(vertex, 1.0);
    vPosition = position.xyz;

    vNormal = normalize((NormalMatrix * vec4(normal, 0.0)).xyz);
    vTangent = normalize((NormalMatrix * vec4(tangent, 0.0)).xyz);
    vBitangent = normalize((NormalMatrix * vec4(bitangent, 0.0)).xyz);

    vTexCoord = texCoord;

    gl_Position = ModelViewProjectionMatrix * vec4(vertex, 1.0);
}
