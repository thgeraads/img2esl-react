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
import {useEffect, useState} from "react";

function App() {
    const [displayType, setDisplayType] = useState('MN@ (122x250)');
    const [canvasDimensions, setCanvasDimensions] = useState({width: 122, height: 250});
    const [originalImageData, setOriginalImageData] = useState(null);
    const [imageData, setImageData] = useState(null);
    const [orientation, setOrientation] = useState(false); // false for landscape, true for portrait
    const [sizeOption, setSizeOption] = useState('fit');

    function handleSizeOptionChange(event) {
        setSizeOption(event.target.value);
    }

    const displayResolutions = {
        'MN@': {width: 122, height: 250},
        'STN@': {width: 200, height: 200}
    };

    const [oneBitColor, setOneBitColor] = useState(true);
    const [dithering, setDithering] = useState(false);
    const [brightness, setBrightness] = useState(50);
    const [flipX, setFlipX] = useState(false);
    const [flipY, setFlipY] = useState(false);

    function handleDisplayChange(event) {
        const selectedDisplay = event.target.innerText.split(" ")[0];
        setDisplayType(selectedDisplay);
        const resolution = displayResolutions[selectedDisplay];
        if (orientation) {
            setCanvasDimensions({width: resolution.height, height: resolution.width});
        } else {
            setCanvasDimensions({width: resolution.width, height: resolution.height});
        }
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
                    setOriginalImageData(image);
                    setImageData(image);
                    drawImageToCanvas(image);
                }
            }
            reader.readAsDataURL(file);
        }
    }

    function drawImageToCanvas(image, sizeOption = 'fit') {
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        const { width, height } = canvasDimensions;

        canvas.width = width;
        canvas.height = height;

        ctx.clearRect(0, 0, width, height);

        // Maintain aspect ratio while drawing the image (for "Fit" and "Fill")
        const imageAspectRatio = image.width / image.height;
        let renderWidth, renderHeight, offsetX, offsetY;

        if (sizeOption === 'fit') {
            if (width / height > imageAspectRatio) {
                renderHeight = height;
                renderWidth = renderHeight * imageAspectRatio;
            } else {
                renderWidth = width;
                renderHeight = renderWidth / imageAspectRatio;
            }
            offsetX = (width - renderWidth) / 2;
            offsetY = (height - renderHeight) / 2;
            ctx.drawImage(image, offsetX, offsetY, renderWidth, renderHeight);
        }

        else if (sizeOption === 'stretch') {
            // Stretch the image to fill the canvas without maintaining aspect ratio
            ctx.drawImage(image, 0, 0, width, height);
        }

        else if (sizeOption === 'fill') {
            // Maintain aspect ratio but ensure the canvas is completely filled
            if (width / height > imageAspectRatio) {
                renderWidth = width;
                renderHeight = renderWidth / imageAspectRatio;
                offsetX = 0;
                offsetY = (height - renderHeight) / 2;
            } else {
                renderHeight = height;
                renderWidth = renderHeight * imageAspectRatio;
                offsetX = (width - renderWidth) / 2;
                offsetY = 0;
            }
            ctx.drawImage(image, offsetX, offsetY, renderWidth, renderHeight);
        }

        let imageDataObject = ctx.getImageData(0, 0, width, height);
        imageDataObject = applyTransformations(imageDataObject);
        ctx.putImageData(imageDataObject, 0, 0);
    }


    function updateImage() {
        if (!originalImageData) return;

        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Redraw the image on canvas with the selected size option
        drawImageToCanvas(originalImageData, sizeOption);
    }

    function applyTransformations(imageData) {
        let modifiedData = imageData;

        if (brightness !== 50) {
            modifiedData = adjustBrightness(modifiedData, brightness);
        }

        // Apply dithering first, before converting to 1-bit
        if (dithering) {
            modifiedData = applyDithering(modifiedData);
        }

        // Then convert to 1-bit color
        if (oneBitColor) {
            modifiedData = convertTo1bpp(modifiedData);
        }

        if (flipX || flipY) {
            modifiedData = flipImage(modifiedData, flipX, flipY);
        }

        return modifiedData;
    }

    function adjustBrightness(imageData, brightness) {
        const data = imageData.data;
        const factor = brightness / 50;

        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, data[i] * factor);
            data[i + 1] = Math.min(255, data[i + 1] * factor);
            data[i + 2] = Math.min(255, data[i + 2] * factor);
        }

        return imageData;
    }

    function convertTo1bpp(imageData) {
        const data = imageData.data;
        const threshold = 128;

        for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            const value = avg > threshold ? 255 : 0;

            data[i] = value;
            data[i + 1] = value;
            data[i + 2] = value;
        }

        return imageData;
    }

    function applyDithering(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const oldR = data[i];
                const oldG = data[i + 1];
                const oldB = data[i + 2];
                const avg = (oldR + oldG + oldB) / 3;
                const error = avg - (avg > 128 ? 255 : 0);

                data[i] = data[i + 1] = data[i + 2] = avg > 128 ? 255 : 0;

                if (x < width - 1) {
                    data[i + 4] += error * 7 / 16;
                }
                if (x > 0 && y < height - 1) {
                    data[i + (width - 1) * 4] += error * 3 / 16;
                }
                if (y < height - 1) {
                    data[i + width * 4] += error * 5 / 16;
                }
                if (x < width - 1 && y < height - 1) {
                    data[i + (width + 1) * 4] += error * 1 / 16;
                }
            }
        }

        return imageData;
    }

    function flipImage(imageData, flipX, flipY) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;

        const flippedData = new Uint8ClampedArray(data.length);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const i = (y * width + x) * 4;
                const j = (y * width + (width - x - 1)) * 4;

                if (flipX && flipY) {
                    const k = ((height - y - 1) * width + x) * 4;
                    flippedData[k] = data[i];
                    flippedData[k + 1] = data[i + 1];
                    flippedData[k + 2] = data[i + 2];
                    flippedData[k + 3] = data[i + 3];
                } else if (flipX) {
                    flippedData[j] = data[i];
                    flippedData[j + 1] = data[i + 1];
                    flippedData[j + 2] = data[i + 2];
                    flippedData[j + 3] = data[i + 3];
                } else if (flipY) {
                    const k = ((height - y - 1) * width + x) * 4;
                    flippedData[k] = data[i];
                    flippedData[k + 1] = data[i + 1];
                    flippedData[k + 2] = data[i + 2];
                    flippedData[k + 3] = data[i + 3];
                }
            }
        }

        return new ImageData(flippedData, width, height);
    }

    useEffect(() => {
        updateImage();
    }, [oneBitColor, dithering, brightness, orientation, flipX, flipY, canvasDimensions, sizeOption]);

    function handleOrientationChange(event) {
        const isPortrait = event.target.checked;
        setOrientation(isPortrait);
        const newDimensions = isPortrait ? {
            width: canvasDimensions.height,
            height: canvasDimensions.width
        } : {width: canvasDimensions.height, height: canvasDimensions.width};
        setCanvasDimensions(newDimensions);
        updateImage();
    }

    return (
        <div id="container">
            <div id="control-panel">
                <h2 id="control-panel-title">ESL Image Uploader</h2>
                <mdui-button onClick={handleImageUpload} id="image-upload-button">Select Image</mdui-button>
                <mdui-dropdown>
                    <mdui-button id="display-dropdown" slot="trigger">Selected display: {displayType}</mdui-button>
                    <mdui-menu>
                        <mdui-menu-item onClick={handleDisplayChange}>MN@ (122x250)</mdui-menu-item>
                        <mdui-menu-item onClick={handleDisplayChange}>STN@ (200x200)</mdui-menu-item>
                    </mdui-menu>
                </mdui-dropdown>

                <p className="label" id="label-brightness">Brightness</p>
                <mdui-slider id="image-brightness-slider" min="0" max="100" value="50"
                             onInput={event => setBrightness(event.target.value)}></mdui-slider>

                <mdui-checkbox id="image-dithering-checkbox" onInput={() => setDithering(!dithering)}>Enable dithering
                </mdui-checkbox>
                <mdui-checkbox checked disabled id="image-1bit-checkbox"
                               onInput={() => setOneBitColor(!oneBitColor)}>1-bit color
                </mdui-checkbox>

                <div className="control-group">
                    <div className="switch-group">
                        <h4>Image Transformations</h4>
                        <div className="label-switch-group">
                            <mdui-switch id="image-orientation" onInput={handleOrientationChange}></mdui-switch>
                            <p className="label" id="label-orientation">Portrait</p>
                        </div>

                        <div className="label-switch-group">
                            <mdui-switch id="image-flip-horizontal" onInput={() => setFlipX(!flipX)}></mdui-switch>
                            <p className="label" id="label-flip-x">Flip horizontally</p>
                        </div>

                        <div className="label-switch-group">
                            <mdui-switch id="image-flip-vertical" onInput={() => setFlipY(!flipY)}></mdui-switch>
                            <p className="label" id="label-flip-y">Flip vertically</p>
                        </div>
                    </div>

                    {/* Radio buttons aligned vertically */}
                    <div className="radio-group">
                        <mdui-radio-group name="size-option" value={sizeOption} onInput={handleSizeOptionChange}>
                            <h4>Image Size Options</h4>
                            <div className="radio-option">
                                <mdui-radio value="stretch" name="size-option">
                                    <p className="label">Stretch</p>
                                </mdui-radio>
                            </div>
                            <div className="radio-option">
                                <mdui-radio value="fit" name="size-option">
                                    <p className="label">Fit</p>
                                </mdui-radio>
                            </div>
                            <div className="radio-option">
                                <mdui-radio value="fill" name="size-option">
                                    <p className="label">Fill</p>
                                </mdui-radio>
                            </div>
                        </mdui-radio-group>
                    </div>
                </div>

                <mdui-button id="connect-button">Connect to display</mdui-button>
            </div>

            <div id="canvas-panel">
                <canvas style={{height: canvasDimensions.height, width: canvasDimensions.width}} id="canvas"></canvas>
                <mdui-button disabled full-width id="send-button">Send to display</mdui-button>
            </div>
        </div>
    );
}

export default App;
