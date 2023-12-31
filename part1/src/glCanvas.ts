/**
 * This file contains the code that sets up the canvas and WebGL context
 */
import Camera from './Camera';
import ModelGL from './ModelGL';
import PPMFileLoader from './PPMFileLoader';

import shaderSourceCodeMap from './ShaderManager';
import SceneData from './SceneData';
import { GLPointLight, GLLights } from './GLLights';


// measure the FPS
let fps = 0;
let lastTime = 0;
let frameNumber = 0;


const sceneData = new SceneData();

function linearLight(point1: number[], point2: number[], lights: number, color: number[]) {
    let deltaX = (point2[0] - point1[0]) / (lights - 1);
    let deltaY = (point2[1] - point1[1]) / (lights - 1);
    let deltaZ = (point2[2] - point1[2]) / (lights - 1);

    for (let i = 0; i <= lights; i++) {
        let light = new GLPointLight([point1[0] + i * deltaX, point1[1] + i * deltaY, point1[2] + i * deltaZ], color);
        sceneData.lights.addPointLight(light);
    }

}

linearLight([-10, .5, -5], [10, .5, -5], 30, [1.0, 1.0, 1.0]);

// lets add a red light to the scene
sceneData.lights.addPointLight(new GLPointLight([5, 5, -5], [1.0, 1.0, 1.0]));
// lets add a white light to the scene
sceneData.lights.addPointLight(new GLPointLight([-5, 5, -5], [1.0, 1.0, 1.0]));
sceneData.lights.addPointLight(new GLPointLight([-5, 5, 5], [1.0, 1.0, 1.0]));
sceneData.lights.addPointLight(new GLPointLight([5, 5, 5], [1.0, 1.0, 1.0]));

// Set up the canvas and WebGL context so that our rendering loop can draw on it
// We store the gl context in the sceneData object so that we can access it later
export const setupCanvas = function () {
    if (!sceneData) {
        return;
    }

    // React is calling this twice, we only want one glContext.
    if (sceneData.glContext !== null) {
        return;
    }

    var canvas = document.getElementById('glCanvas') as HTMLCanvasElement;
    if (!canvas) {
        alert('Canvas not found');
        return;
    }

    // Get the WebGL context NOte we need WebGL2 for this application
    var gl = canvas.getContext('webgl2') || canvas.getContext('experimental-webgl') as WebGLRenderingContext;
    if (!gl) {
        alert('WebGL not supported');
        return;
    }

    sceneData.width = canvas.width;
    sceneData.height = canvas.height;

    // Store the WebGLRenderingContext on the sceneData object
    sceneData.glContext = gl;

    // Set up the viewport


    // Set the clear color to be purple
    gl.clearColor(1.0, 0.0, 1.0, 1.0);
    // Clear the color buffer with clear color
    gl.clear(gl.COLOR_BUFFER_BIT);

}

// for now the scene is contained here in glCanvas when a scene is pulled out
// then this needs to go outside of this file.
export function updateSceneData(model: ModelGL | null, camera: Camera | null): void {
    if (!sceneData) {
        return;
    }

    // We know we need to clean up the textures when we switch models

    cleanUpTextures(sceneData.glContext!, sceneData.model!);


    sceneData.camera = camera;
    sceneData.model = model;
    if (model !== null && camera !== null) {
        renderLoop();
    }
}

function compileProgram(gl: WebGLRenderingContext): WebGLProgram | null {
    if (!sceneData.model) {
        return null;
    }

    if (sceneData.model.renderingProgram !== null) {
        return sceneData.model.renderingProgram;
    }
    if (!sceneData.camera) {
        return null;
    }

    if (!gl) {
        return null;
    }



    const vertexShaderName = sceneData.model.getVertexShaderName();
    const fragmentShaderName = sceneData.model.getFragmentShaderName();


    console.log("Compiling " + vertexShaderName + " and " + fragmentShaderName);

    // ******************************************************
    // Create the vertex shader program
    // ******************************************************   
    const vertexShaderProgram = gl.createShader(gl.VERTEX_SHADER);

    if (!vertexShaderProgram) {
        throw new Error('Failed to create vertex shader');
    }

    // get the vertex shader source code from the shader map
    const vertexShader = shaderSourceCodeMap.get(vertexShaderName) as string;

    // Now that we have the code let's compile it compile it
    // attach the shader source code to the vertex shader
    gl.shaderSource(vertexShaderProgram, vertexShader);

    // compile the vertex shader
    gl.compileShader(vertexShaderProgram);

    // check if the vertex shader compiled successfully
    const vertexShaderCompiled = gl.getShaderParameter(vertexShaderProgram, gl.COMPILE_STATUS);
    if (!vertexShaderCompiled) {
        console.log(vertexShader)
        console.log('tried to compile ' + vertexShaderName);
        console.log(gl.getShaderInfoLog(vertexShaderProgram));
        console.error('Failed to compile vertex shader');
        return null;
    }

    // ******************************************************
    // create the fragment shader
    // ******************************************************
    const fragmentShaderObject = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fragmentShaderObject) {
        throw new Error('Failed to create fragment shader');
    }

    // get the fragment shader source code from the shader map 
    const fragmentShader = shaderSourceCodeMap.get(fragmentShaderName) as string;

    // attach the shader source code to the fragment shader
    gl.shaderSource(fragmentShaderObject, fragmentShader);

    // compile the fragment shader
    gl.compileShader(fragmentShaderObject);

    // check if the fragment shader compiled successfully
    const fragmentShaderCompiled = gl.getShaderParameter(fragmentShaderObject, gl.COMPILE_STATUS);
    if (!fragmentShaderCompiled) {
        console.log(fragmentShader);
        console.log('tried to compile ' + fragmentShaderName);
        console.log(gl.getShaderInfoLog(fragmentShaderObject));
        console.error('Failed to compile fragment shader');
        return null;
    }

    // ******************************************************
    // create a shader program
    // ******************************************************
    const shaderProgram = gl.createProgram();
    if (!shaderProgram) {
        throw new Error('Failed to create shader program');
    }

    // attach the vertex shader to the shader program
    gl.attachShader(shaderProgram, vertexShaderProgram);

    // attach the fragment shader to the shader program
    gl.attachShader(shaderProgram, fragmentShaderObject);

    // link all attached shaders
    gl.linkProgram(shaderProgram);

    // clean up the shaders
    gl.deleteShader(vertexShaderProgram);
    gl.deleteShader(fragmentShaderObject);


    // check if the shader program linked successfully
    const shaderProgramLinked = gl.getProgramParameter(shaderProgram, gl.LINK_STATUS);
    if (!shaderProgramLinked) {
        console.error('Failed to link shader program');
        return null;
    }
    // cache the shader program
    sceneData.model.renderingProgram = shaderProgram;
    return shaderProgram;
}

/** 
 * set up lights for gl to use
 * @param gl
 * uses sceneData.lights
 */
function setUpLights(gl: WebGLRenderingContext, shaderProgram: WebGLProgram) {
    if (!gl) {
        return;
    }

    if (!sceneData.lights) {
        return;
    }

    // we only do this for a program that has a VerteTextureNormalNormalMapShader
    if (sceneData.model!.getVertexShaderName() !== 'vertexTextureNormalNormalMapShader') {
        return;
    }

    // get the light position attribute location
    const lightPositionsLocation = gl.getUniformLocation(shaderProgram, 'lightsUniform');
    if (lightPositionsLocation === null) {
        throw new Error('Failed to get the storage location of hack');
    }
    let lightPositions = sceneData.lights.getPositionsFloat32();
    gl.uniform3fv(lightPositionsLocation, lightPositions);

    // get the light color attribute location
    const lightColorsLocation = gl.getUniformLocation(shaderProgram, 'lightColors');
    if (lightColorsLocation === null) {
        throw new Error('Failed to get the storage location of lightColor');
    }
    const colors = sceneData.lights.getColorsFloat32();
    gl.uniform3fv(lightColorsLocation, colors);


}


/**
 * setUpTexture for gl to use.   
 * @param gl 
 * @param model 
 * @param shaderProgram 
 * @param textureUnit 
 * @param textureType 
 * @param samplerName 
 * @returns 
 */
function setUpTexture(gl: WebGLRenderingContext,
    model: ModelGL,
    shaderProgram: WebGLProgram,
    textureUnit: number,
    textureType: string,
    samplerName: string): WebGLTexture | null {
    if (!gl) {
        return null;
    }



    if (!model) {
        return null;
    }

    // get the texture coordinate attribute location
    const texCoordLocation = gl.getAttribLocation(shaderProgram, 'textureCoord');
    // check to see if we got the attribute location
    if (texCoordLocation === -1) {
        console.log('Failed to get the storage location of texCoord');
    }

    // enable the texture coordinate attribute
    gl.enableVertexAttribArray(texCoordLocation);

    // tell the texture coordinate attribute how to get data out of the texture coordinate buffer
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, model.vertexStride, model.textureOffset);

    // create a texture
    let texture = gl.createTexture();
    if (!texture) {
        console.log('Failed to create the texture object');
        return null
    }


    // bind the texture to the texture unit
    gl.activeTexture(gl.TEXTURE0 + textureUnit);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // set the parameters for the texture
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);

    // set the filtering for the texture
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    const diffuseTextureName = model.textures.get(textureType) as string;

    // load the texture data
    // The PPMFileLoader caches the ppm files so if the file has already been loaded
    // so it is ok to just call this here since it will not load the file again
    const ppmIMG = PPMFileLoader.getInstance().loadFile(diffuseTextureName);


    if (ppmIMG === undefined) {
        console.log("ppmFile is undefined");
        return null
    }
    // load the texture data into the texture
    if (ppmIMG.data === undefined) {
        console.log("ppmFile.data is undefined");
        return null;
    }

    // set the value of the uniorm sampler to the texture unit
    let textureLocation = gl.getUniformLocation(shaderProgram, samplerName);
    if (textureLocation === null) {
        throw new Error(`The sampler name ${samplerName} was not found in the program`)
    }
    gl.uniform1i(textureLocation, textureUnit);

    // bind the data to the texture
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, ppmIMG.width, ppmIMG.height, 0, gl.RGB, gl.UNSIGNED_BYTE, ppmIMG.data);
    gl.generateMipmap(gl.TEXTURE_2D);

    return texture;
}

/**
 * setUpTextures based on what the model needs.
 * If the model already has the textures then we are done.
 * @param gl 
 * @param model 
 * @param shaderProgram 
 * @returns 
 */
function setUpTextures(gl: WebGLRenderingContext,
    model: ModelGL,
    shaderProgram: WebGLProgram): boolean {

    let texture: WebGLTexture | null = null;
    if (!gl) {
        return false;
    }
    if (!model) {
        return false;
    }

    if (model.hasDiffuseMap) {
        if (model.diffuseTexture === null) {
            model.diffuseTexture = setUpTexture(gl, model, shaderProgram, 0, 'map_Kd', 'textureSampler');
        }
        if (model.diffuseTexture === null) {
            throw new Error("Failed to set up diffuse texture, it was expected to be there but it was not");
        }
    }

    if (model.hasNormalMap) {
        if (model.normalTexture === null) {
            model.normalTexture = setUpTexture(gl, model, shaderProgram, 1, 'map_Bump', 'normalSampler');
        }
        if (model.normalTexture === null) {
            throw new Error("Failed to set up normal texture, it was expected to be there but it was not");
        }
        const uvOffsetLocation = gl.getUniformLocation(shaderProgram, 'uvOffset');

        // get the now time
        let now = performance.now();

        const period = 25000;

        now = now % period;

        now = now / period * 2 * Math.PI;




        const uvData = new Float32Array([Math.sin(now), 0]);
        gl.uniform2fv(uvOffsetLocation, uvData);


    }

    return true;

}

function cleanUpTextures(gl: WebGLRenderingContext, model: ModelGL) {
    if (!gl) {  // this should probably throw an error
        return;
    }
    if (!model) {  // as should this, also throw an error
        return;
    }

    if (model.hasDiffuseMap) {
        if (model.diffuseTexture !== null) {
            gl.deleteTexture(model.diffuseTexture);
            model.diffuseTexture = null;
        }
    }

    if (model.hasNormalMap) {
        if (model.normalTexture !== null) {
            gl.deleteTexture(model.normalTexture);
            model.normalTexture = null;
        }
    }
}

function setUpVertexBuffer(gl: WebGLRenderingContext,
    model: ModelGL,
    shaderProgram: WebGLProgram) {
    // create a buffer for Vertex data
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, model.packedVertexBuffer, gl.STATIC_DRAW);



    // create an index buffer
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model.vertexIndices, gl.STATIC_DRAW);

    // ******************************************************
    // Now we need to figure out where the input data is going to go
    // ******************************************************

    // get the position attribute location
    const positionLocation = gl.getAttribLocation(shaderProgram, 'position');

    // enable the position attribute
    gl.enableVertexAttribArray(positionLocation);

    // tell the position attribute how to get data out of the position buffer
    // the position attribute is a vec3 (3 values per vertex) and then there are three
    // colors per vertex
    gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, model.vertexStride, 0);
}




function renderLoop(): void {

    // we might get called early. lets bail out if the information is incomplete.

    if (sceneData === null) {
        return;
    }

    let gl = sceneData.glContext;

    if (!gl) {
        return;
    }

    let model = sceneData.model;
    if (!model) {
        return;
    }

    let camera = sceneData.camera;
    if (!camera) {
        return;
    }

    // ******************************************************
    // Compile the shader program if it has not been compiled yet
    // the compileProgram will store the compiled program in the 
    // current model in sceneData
    // ******************************************************
    const shaderProgram = compileProgram(gl);

    if (!shaderProgram) {
        return;
    }
    // use the shader program
    gl.useProgram(shaderProgram);





    setUpVertexBuffer(gl, model, shaderProgram);

    setUpLights(gl, shaderProgram);


    // SetUpTextures will set up any textures required by the model.
    setUpTextures(gl, model, shaderProgram)


    const vertexShaderName = model.getVertexShaderName();
    // check to see if Normal is in the shader name
    if (vertexShaderName.includes('Normal')) {
        // get the normal attribute location
        const normalLocation = gl.getAttribLocation(shaderProgram, 'normal');

        // enable the normal attribute

        gl.enableVertexAttribArray(normalLocation);

        // tell the normal attribute how to get data out of the normal buffer
        gl.vertexAttribPointer(normalLocation, 3, gl.FLOAT, false, model.vertexStride, model.normalOffset);
    }


    camera.setViewPortWidth(sceneData.width);
    camera.setViewPortHeight(sceneData.height);



    // get the projection matrix location
    const projectionMatrixLocation = gl.getUniformLocation(shaderProgram, 'projectionMatrix');

    // set the projection matrix
    gl.uniformMatrix4fv(projectionMatrixLocation, false, camera.projectionMatrix);

    // get the view matrix location
    const viewMatrixLocation = gl.getUniformLocation(shaderProgram, 'viewMatrix');

    // set the view matrix
    gl.uniformMatrix4fv(viewMatrixLocation, false, camera.viewMatrix);




    // get the model matrix.
    const modelMatrix = model.getModelMatrix();


    // get the model matrix location
    const modelMatrixLocation = gl.getUniformLocation(shaderProgram, 'modelMatrix');

    // set the model matrix
    gl.uniformMatrix4fv(modelMatrixLocation, false, modelMatrix);


    // ******************************************************
    // Ok we are good to go.   Lets make some graphics
    // ****************************************************** 
    // Clear the whole canvas
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);


    // Clear the canvas to a purple color
    // currently in this code if you leave the clear in there
    // no image is seen.
    let color = (sceneData.frameNumber++ % 255) / 255.0;
    gl.clearColor(color, .2, .6, 0.1);
    //gl.clear(gl.COLOR_BUFFER_BIT);



    if (!sceneData.camera!.usePerspective) {
        // calculate the square that fits in the canvas make that the viewport
        let squareSize = gl.canvas.width;
        if (gl.canvas.width > gl.canvas.height) {
            squareSize = gl.canvas.height;
        }
        // calculate the offset for the square  
        const xOffset = (gl.canvas.width - squareSize) / 2;
        const yOffset = (gl.canvas.height - squareSize) / 2;


        gl.viewport(xOffset, yOffset, squareSize, squareSize);
    } else {
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    }

    // enable the z-buffer
    gl.enable(gl.DEPTH_TEST);



    // This is really slow but it is good for debugging.
    if (!camera.renderSolid) {
        for (let i = 0; i < model.numTriangles!; i++) {
            const index = i * 3;
            gl.drawElements(gl.LINE_LOOP, 3, gl.UNSIGNED_SHORT, index * 2);
        }
    } else {
        gl.drawElements(gl.TRIANGLES, model.vertexIndices.length, gl.UNSIGNED_SHORT, 0);
    }


    gl.flush();
    gl.finish();


    // ******************************************************
    // Calculate the FPS
    // ******************************************************
    frameNumber++;
    const now = performance.now();

    if (now - lastTime > 1000) {
        fps = frameNumber;
        console.log("FPS: " + fps);
        frameNumber = 0;
        lastTime = now;
    }

    requestAnimationFrame(renderLoop);
}