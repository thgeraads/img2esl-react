import 'mdui/mdui.css';
import 'mdui/components/switch.js';
import 'mdui/components/button.js';
import 'mdui/components/slider.js';
import 'mdui/components/dropdown.js';
import 'mdui/components/menu.js';
import 'mdui/components/menu-item.js';
import 'mdui/components/checkbox.js';
import 'mdui/components/circular-progress.js';
import 'mdui/components/top-app-bar.js';
import 'mdui/components/tab.js';
import 'mdui/components/tabs.js';
import 'mdui/components/tab-panel.js';
import 'mdui/components/radio.js';
import 'mdui/components/radio-group.js';
import { useEffect, useState } from "react";

function App() {
    const [displayType, setDisplayType] = useState('MN@ (122x250)');
    const [canvasDimensions, setCanvasDimensions] = useState({ width: 122, height: 250 });
    const [originalImageData, setOriginalImageData] = useState(null);  // Store unaltered image
    const [imageData, setImageData] = useState(null);  // Store the current image being displayed
    const displayResolutions = {
        'MN@': { width: 122, height: 250 },
        'STN@': { width: 200, height: 200 }
    };

    // image manipulation flags
    const [oneBitColor, setOneBitColor] = useState(true);
    const [dithering, setDithering] = useState(false);
    const [brightness, setBrightness] = useState(50);
    const [orientation, setOrientation] = useState("portrait");
    const [flipX, setFlipX] = useState(false);
    const [flipY, setFlipY] = useState(false);

    function handleDisplayChange(event) {
        setDisplayType(event.target.innerText);
        setCanvasDimensions(displayResolutions[event.target.innerText.split(" ")[0]]);
    }

    function handleImageUpload(event) {
        const imageUpload = document.createElement('input');
        imageUpload.type = 'file';
        imageUpload.accept = 'image/*';
        imageUpload.click();

        imageUpload.onchange = async function () {
            const file = imageUpload.files[0];
            const reader = new FileReader();

            reader.onload = function () {
                const image = new Image();
                image.src = reader.result;
                image.onload = function () {
                    // Store the original image data when the image is loaded
                    setOriginalImageData(image);
                    setImageData(image);  // Initially, imageData is the same as original
                    drawImageToCanvas(image);
                }
            }
            reader.readAsDataURL(file);
        }
    }

    function drawImageToCanvas(image) {
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');

        const width = displayType === 'MN@' ? 122 : 200;
        const height = displayType === 'MN@' ? 250 : 200;

        canvas.width = width;
        canvas.height = height;

        // Draw image to canvas
        ctx.drawImage(image, 0, 0, width, height);

        // Apply 1-bit color conversion immediately after drawing the image
        let imageDataObject = ctx.getImageData(0, 0, width, height);
        imageDataObject = convertTo1bpp(imageDataObject);
        ctx.putImageData(imageDataObject, 0, 0);
    }

    function updateImage() {
        if (!originalImageData) return;  // Exit if no image is loaded

        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');

        // Start with the original image data
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(originalImageData, 0, 0, canvas.width, canvas.height);

        // Get a fresh copy of the image data from the canvas
        let imageDataObject = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Apply transformations from scratch
        imageDataObject = applyTransformations(imageDataObject);

        // Draw the modified image data back to the canvas
        ctx.putImageData(imageDataObject, 0, 0);
    }

    function applyTransformations(imageData) {
        let modifiedData = imageData;

        // Apply brightness adjustment first
        if (brightness !== 50) {
            modifiedData = adjustBrightness(modifiedData, brightness);
        }

        // Apply dithering first if enabled
        if (dithering) {
            modifiedData = applyDithering(modifiedData);
        }

        // Apply 1-bit color conversion last to ensure the image is black-and-white
        if (oneBitColor) {
            modifiedData = convertTo1bpp(modifiedData);
        }

        // Apply flipping if necessary
        if (flipX || flipY) {
            modifiedData = flipImage(modifiedData, flipX, flipY);
        }

        return modifiedData;
    }


    function adjustBrightness(imageData, brightness) {
        const data = imageData.data;
        const factor = brightness / 50;  // Adjust the brightness factor

        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, data[i] * factor);      // Red
            data[i + 1] = Math.min(255, data[i + 1] * factor);  // Green
            data[i + 2] = Math.min(255, data[i + 2] * factor);  // Blue
        }

        return imageData;
    }

    function convertTo1bpp(imageData) {
        const data = imageData.data;  // Pixel data in RGBA format
        const threshold = 128;  // Threshold for determining black or white

        for (let i = 0; i < data.length; i += 4) {
            // Calculate the grayscale value (average of R, G, B)
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;

            // If the grayscale value is above the threshold, set it to white (255), otherwise black (0)
            const value = avg > threshold ? 255 : 0;

            // Apply the same value to R, G, and B channels to make the pixel black or white
            data[i] = value;        // Red channel
            data[i + 1] = value;    // Green channel
            data[i + 2] = value;    // Blue channel
            // Leave the alpha channel unchanged (data[i + 3])
        }

        return imageData;
    }

    function applyDithering(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;  // Index of the current pixel

                // Get the grayscale value of the current pixel
                const oldR = data[i];
                const oldG = data[i + 1];
                const oldB = data[i + 2];
                const avg = (oldR + oldG + oldB) / 3;

                // Calculate the error
                const error = avg - (avg > 128 ? 255 : 0);

                // Set the new pixel value
                data[i] = data[i + 1] = data[i + 2] = avg > 128 ? 255 : 0;

                // Distribute the error to neighboring pixels
                data[i + 4] += error * 7 / 16;  // Right neighbor
                data[i + (width - 1) * 4] += error * 3 / 16;  // Bottom-left neighbor
                data[i + width * 4] += error * 5 / 16;  // Bottom neighbor
                data[i + (width + 1) * 4] += error * 1 / 16;  // Bottom-right neighbor
            }
        }

        return imageData;
    }

    function flipImage(imageData, flipX, flipY) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = imageData.width;
        canvas.height = imageData.height;

        // Draw the image data onto an off-screen canvas to flip it
        ctx.putImageData(imageData, 0, 0);

        // Perform the flips by translating and scaling the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
        ctx.drawImage(canvas, flipX ? -canvas.width : 0, flipY ? -canvas.height : 0);
        ctx.restore();

        return ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    useEffect(() => {
        updateImage();  // Ensure updateImage is called on flag changes
    }, [oneBitColor, dithering, brightness, orientation, flipX, flipY]);

    return (
        <div id="container">
            <div id="control-panel">
                <h2 id="control-panel-title">ESL Image Uploader</h2>
                <mdui-button onClick={event => { handleImageUpload(event); }} id="image-upload-button">Select Image</mdui-button>
                <mdui-dropdown>
                    <mdui-button id="display-dropdown" slot="trigger">Selected display: {displayType}</mdui-button>
                    <mdui-menu>
                        <mdui-menu-item onClick={event => { handleDisplayChange(event); }}>MN@ (122x250)</mdui-menu-item>
                        <mdui-menu-item onClick={event => { handleDisplayChange(event); }}>STN@ (200x200)</mdui-menu-item>
                    </mdui-menu>
                </mdui-dropdown>

                <p className="label" id="label-brightness">Brightness</p>
                <mdui-slider id="image-brightness-slider" min="0" max="100" value="50" onInput={event => {
                    setBrightness(event.target.value);
                }}></mdui-slider>

                <mdui-checkbox id="image-dithering-checkbox" onInput={() =>{
                    setDithering(!dithering);
                }}>Enable dithering</mdui-checkbox>
                <mdui-checkbox checked disabled id="image-1bit-checkbox" onInput={() => {
                    setOneBitColor(!oneBitColor);
                }}>1-bit color</mdui-checkbox>

                {/* Flex container to align switches and radio buttons */}
                <div className="control-group">
                    <div className="switch-group">
                        <h4>Image Transformations</h4>
                        <div className="label-switch-group">
                            <mdui-switch name="orientation" id="image-orientation"></mdui-switch>
                            <p className="label" id="label-orientation">Orientation</p>
                        </div>

                        <div className="label-switch-group">
                            <mdui-switch id="image-flip-horizontal" onInput={() => {
                                console.log(flipX);
                                setFlipX(!flipX)}}></mdui-switch>
                            <p className="label" id="label-flip-x">Flip horizontally</p>
                        </div>

                        <div className="label-switch-group">
                            <mdui-switch id="image-flip-vertical" onInput={() => setFlipY(!flipY)}></mdui-switch>
                            <p className="label" id="label-flip-y">Flip vertically</p>
                        </div>
                    </div>

                    {/* Radio buttons aligned vertically */}
                    <div className="radio-group">
                        <h4>Image Size Options</h4>
                        <div className="radio-option">
                            <mdui-radio value="stretch" name="size-option"></mdui-radio>
                            <p className="label">Stretch</p>
                        </div>
                        <div className="radio-option">
                            <mdui-radio value="fit" name="size-option"></mdui-radio>
                            <p className="label">Fit</p>
                        </div>
                        <div className="radio-option">
                            <mdui-radio value="fill" name="size-option"></mdui-radio>
                            <p className="label">Fill</p>
                        </div>
                    </div>
                </div>

                <mdui-button id="connect-button">Connect to display</mdui-button>
            </div>

            <div id="canvas-panel">
                <canvas style={{ height: canvasDimensions.height, width: canvasDimensions.width }} id="canvas"></canvas>
                <mdui-button disabled full-width id="send-button">Send to display</mdui-button>
            </div>
        </div>
    );
}

export default App;
