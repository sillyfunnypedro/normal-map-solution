#version 300 es
/**
 * Vertex shader for the 5310 Graphics course.
 * 
 * This shader applies a full transformation to the vertex position.
 * It computes the normal transformation matrix and applies it to the normal.
 * It also passes the texture coordinate through.
 * It also passes the normal through.
 * It also passes the fragOutPosition through.
 */
layout(location=0) in vec3 position;
layout(location=1) in vec2 textureCoord;
layout(location=2) in vec3 normal;

uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform vec3 eyePosition;




out vec2 textureCoordOut;
out vec3 normalOut;
out vec3 fragPositionOut;
out vec3 viewDirectionOut;


void main() {
    // calculate the gl_Position
    gl_Position =   projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);

    // calculate the fragOutPosition
    fragPositionOut = vec3(modelMatrix * vec4(position, 1.0));

    // calculate the normalMatrix and transform the normal
    mat3 normalMatrix = transpose(inverse(mat3(modelMatrix)));
    normalOut = normalize(normalMatrix * normal);
    normalOut = vec3(0.0, 1.0, 0.0);
    normalOut = normal;

    // calculate the viewDirection
    viewDirectionOut = normalize(eyePosition - fragPositionOut);
    
    // pass the texture coordinate through
    textureCoordOut = textureCoord;
}
