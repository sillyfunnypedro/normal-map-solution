import Camera from "./Camera";
import ModelGL from "./ModelGL";

import { GLPointLight, GLLights } from "./GLLights";

/**
 * A scene is a collection of objects, lights, and a camera.
 * 
 * This class is used to store the data for a scene.
 */


class SceneData {
    // Store the WebGL rendering context
    glContext: WebGLRenderingContext | null = null;

    // Store the primary camera
    camera: Camera | null = null;
    model: ModelGL | null = null;
    models: Array<ModelGL> = [];

    // store the canvas width and height.
    width: number = 0;
    height: number = 0;



    renderMode: string = "solid";
    frameNumber: number = 0;

    lights: GLLights = new GLLights();

}

export default SceneData;