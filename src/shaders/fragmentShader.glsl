#ifdef GL_FRAGMENT_PRECISION_HIGH
   precision highp float;
#else
   precision mediump float;
#endif

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vTexCoord;
varying vec3 vTangent;
varying vec3 vBitangent;

uniform vec3 lightPosition;
uniform vec3 ambientColor;
uniform vec3 diffuseColor;
uniform vec3 specularColor;
uniform float shininess;

uniform sampler2D diffuseMap;
uniform sampler2D specularMap;
uniform sampler2D normalMap;

void main() {
    // Sample textures
    vec3 diffuseTexture = texture2D(diffuseMap, vTexCoord).rgb;
    float roughnessTexture = texture2D(specularMap, vTexCoord).r;
    // Convert roughness to specular (invert: specular = 1 - roughness)
    float specularTexture = 1.0 - roughnessTexture;
    vec3 normalMapSample = texture2D(normalMap, vTexCoord).rgb;

    // Transform normal from [0,1] to [-1,1]
    vec3 tangentSpaceNormal = normalMapSample * 2.0 - 1.0;

    // Construct TBN matrix (tangent space to view space)
    mat3 TBN = mat3(
        normalize(vTangent),
        normalize(vBitangent),
        normalize(vNormal)
    );

    // Transform normal from tangent space to view space
    vec3 N = normalize(TBN * tangentSpaceNormal);

    // Calculate light direction
    vec3 L = normalize(lightPosition - vPosition);

    // Calculate view direction (assuming camera at origin in view space)
    vec3 V = normalize(-vPosition);

    // Calculate reflection direction
    vec3 R = reflect(-L, N);

    // Ambient component (modulated by diffuse texture)
    vec3 ambient = ambientColor * diffuseTexture;

    // Diffuse component (modulated by diffuse texture)
    float diffuseIntensity = max(dot(N, L), 0.0);
    vec3 diffuse = diffuseColor * diffuseTexture * diffuseIntensity;

    // Specular component (modulated by specular texture)
    float specularIntensity = pow(max(dot(R, V), 0.0), shininess);
    vec3 specular = specularColor * specularTexture * specularIntensity;

    vec3 finalColor = ambient + diffuse + specular;

    gl_FragColor = vec4(finalColor, 1.0);
}
