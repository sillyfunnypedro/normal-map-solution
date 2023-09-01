import PPM from './PPM';
import { objectFileMap } from './ObjectFileMap';


/**
 * PPMFileLoader.ts
    * @description PPMFileLoader class
    * @class PPMFileLoader
 */

class PPMFileLoader {
    // this is where you would put the URL to your server
    private URLPrefix: string = 'http://localhost:8080/objects/';
    private modelCache: Map<string, PPM> = new Map();

    private static instance: PPMFileLoader;

    private constructor() {
        // do nothing
    }

    public static getInstance(): PPMFileLoader {
        if (!PPMFileLoader.instance) {
            PPMFileLoader.instance = new PPMFileLoader();
        }
        return PPMFileLoader.instance;
    }
    /**
     * Load a file from a given path, and store it in the cache
     * the function does not return anything.
     * @param {string} path
     * Call back function to indicate model is ready
     * @param {Function} callback
     * @param 
     * @memberof PPMFileLoader
     * @method load
     * @public
     * */
    public async loadIntoCache(textureFilePath: string): Promise<PPM | undefined> {

        if (this.modelCache.has(textureFilePath)) {
            console.log(`${textureFilePath} already loaded`);
            const image = this.modelCache.get(textureFilePath);
            return image;
        }
        console.log('>>>>>>>loading into cache' + textureFilePath,);
        const fullPath = this.URLPrefix + textureFilePath;
        console.log(fullPath);
        await fetch(fullPath)
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response;
            }
            )
            .then((response => response.text()))
            .then((data) => {
                const image = new PPM();
                image.loadFileFromString(data);
                this.modelCache.set(textureFilePath, image);
                console.log('>>>>>>>loaded into cache ' + textureFilePath,);
                return image;
            }
            )
            .catch((error) => {
                console.log(error);
            }
            );
    }
    public loadFile(textureFilePath: string): PPM | undefined {
        if (this.modelCache.has(textureFilePath)) {
            console.log(`${textureFilePath} already loaded`);
            const image = this.modelCache.get(textureFilePath);
            return image;
        }
        return undefined;
    }


}

export default PPMFileLoader;