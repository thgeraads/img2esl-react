// Get DOM elements
const imageUpload = document.getElementById('imageUpload');
const ditherBox = document.getElementById('dither');
const brightnessSlider = document.getElementById('brightness');
const bitmapBox = document.getElementById('bitmap');
const displaySelector = document.getElementById('displayType');
const orientationRadios = document.querySelectorAll("input[name='orientation']");

// New Flip Checkboxes
const flipHorizontalBox = document.getElementById('flipHorizontal');
const flipVerticalBox = document.getElementById('flipVertical');

// Buttons
const connectButton = document.getElementById('connectToLabelButton');
const sendButton = document.getElementById('sendToLabelButton');

// Canvas and context
const canvas = document.getElementById('modifiedImage');
const ctx = canvas.getContext('2d');

// Image variables
let originalImage = null;     // Original Image element
let resizedImageData = null; // Image data after resizing
let processedImageData = null; // Image data after processing (brightness, dithering, etc.)

// Event Listeners
imageUpload.addEventListener('change', handleImage, false);
ditherBox.addEventListener('change', redrawCanvas);
brightnessSlider.addEventListener('input', redrawCanvas);
bitmapBox.addEventListener('change', redrawCanvas);
displaySelector.addEventListener('change', resizeImage);
orientationRadios.forEach(radio => {
    radio.addEventListener('change', resizeImage);
});
flipHorizontalBox.addEventListener('change', redrawCanvas);
flipVerticalBox.addEventListener('change', redrawCanvas);
window.onload = function () {
    document.getElementById("landscape").checked = true;
    document.getElementById("bitmap").checked = true;
    document.getElementById("bitmap").disabled = true;
};

/**
 * Handle Image Upload
 */
function handleImage() {
    const file = imageUpload.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        loadOriginalImage(event.target.result);
    }
    reader.readAsDataURL(file);
}

/**
 * Load Original Image into Canvas
 * @param {string} imageSrc - Source of the image
 */
function loadOriginalImage(imageSrc) {
    originalImage = new Image();
    originalImage.onload = function () {
        resizeImage();
    }
    originalImage.src = imageSrc;
}

/**
 * Resize Image Based on Display Type and Orientation
 */
function resizeImage() {
    if (!originalImage) return;

    const displayType = displaySelector.value;
    const portrait = document.getElementById("portrait").checked;
    const landscape = document.getElementById("landscape").checked;

    // Define dimensions based on display type and orientation
    let width, height;
    if (displayType === "MN@") {
        if (portrait) {
            width = 122;
            height = 250;
        } else if (landscape) {
            width = 250;
            height = 122;
        }
    } else {
        // Default dimensions if other display types are added
        width = originalImage.width;
        height = originalImage.height;
    }

    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Calculate aspect ratio
    const aspectRatio = originalImage.width / originalImage.height;
    let targetWidth, targetHeight;

    if (width / height > aspectRatio) {
        // Fit to height
        targetHeight = height;
        targetWidth = height * aspectRatio;
    } else {
        // Fit to width
        targetWidth = width;
        targetHeight = width / aspectRatio;
    }

    // Calculate offsets to center the image
    const offsetX = (width - targetWidth) / 2;
    const offsetY = (height - targetHeight) / 2;

    // Draw the resized image on the canvas
    ctx.drawImage(originalImage, 0, 0, originalImage.width, originalImage.height, offsetX, offsetY, targetWidth, targetHeight);

    // Save the resized image data
    resizedImageData = ctx.getImageData(0, 0, width, height);
    processedImageData = ctx.getImageData(0, 0, width, height);

    // Redraw canvas with current settings
    redrawCanvas();
}

/**
 * Redraw Canvas with Applied Settings
 */
function redrawCanvas() {
    if (!resizedImageData) return;

    // Start with the resized image data
    processedImageData = new ImageData(
        new Uint8ClampedArray(resizedImageData.data),
        resizedImageData.width,
        resizedImageData.height
    );

    // Apply brightness
    if (brightnessSlider.value !== "100") {
        setBrightness(processedImageData, brightnessSlider.value);
    }

    // Apply dithering
    if (ditherBox.checked) {
        ditherImage(processedImageData);
    }

    // Convert to 1-bit color
    if (bitmapBox.checked) {
        convertTo1Bit(processedImageData);
    }

    // Apply flipping
    if (flipHorizontalBox.checked || flipVerticalBox.checked) {
        flipImage(processedImageData, flipHorizontalBox.checked, flipVerticalBox.checked);
    }

    // Remove transparency
    removeTransparency(processedImageData);

    // Put the processed image data back to the canvas
    ctx.putImageData(processedImageData, 0, 0);
}

/**
 * Set Brightness of Image Data
 * @param {ImageData} imageData
 * @param {number} brightness - Brightness value (0-200)
 */
function setBrightness(imageData, brightness) {
    const data = imageData.data;
    const brightnessFactor = brightness / 100;

    for (let i = 0; i < data.length; i += 4) {
        data[i]     = clamp(data[i] * brightnessFactor);     // Red
        data[i + 1] = clamp(data[i + 1] * brightnessFactor); // Green
        data[i + 2] = clamp(data[i + 2] * brightnessFactor); // Blue
        // Alpha channel remains unchanged
    }
}

/**
 * Clamp value between 0 and 255
 * @param {number} value
 * @returns {number}
 */
function clamp(value) {
    return Math.max(0, Math.min(255, value));
}

/**
 * Apply Floyd-Steinberg Dithering to Image Data
 * @param {ImageData} imageData
 */
function ditherImage(imageData) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const oldPixel = data[idx];
            const newPixel = oldPixel < 128 ? 0 : 255;
            const error = oldPixel - newPixel;

            data[idx]     = newPixel;
            data[idx + 1] = newPixel;
            data[idx + 2] = newPixel;

            // Distribute the error
            if (x < width - 1) {
                data[idx + 4]     = clamp(data[idx + 4]     + error * 7 / 16);
                data[idx + 5]     = clamp(data[idx + 5]     + error * 7 / 16);
                data[idx + 6]     = clamp(data[idx + 6]     + error * 7 / 16);
            }
            if (y < height - 1 && x > 0) {
                const idxBottomLeft = ((y + 1) * width + (x - 1)) * 4;
                data[idxBottomLeft]     = clamp(data[idxBottomLeft]     + error * 3 / 16);
                data[idxBottomLeft + 1] = clamp(data[idxBottomLeft + 1] + error * 3 / 16);
                data[idxBottomLeft + 2] = clamp(data[idxBottomLeft + 2] + error * 3 / 16);
            }
            if (y < height - 1) {
                const idxBottom = ((y + 1) * width + x) * 4;
                data[idxBottom]     = clamp(data[idxBottom]     + error * 5 / 16);
                data[idxBottom + 1] = clamp(data[idxBottom + 1] + error * 5 / 16);
                data[idxBottom + 2] = clamp(data[idxBottom + 2] + error * 5 / 16);
            }
            if (y < height - 1 && x < width - 1) {
                const idxBottomRight = ((y + 1) * width + (x + 1)) * 4;
                data[idxBottomRight]     = clamp(data[idxBottomRight]     + error * 1 / 16);
                data[idxBottomRight + 1] = clamp(data[idxBottomRight + 1] + error * 1 / 16);
                data[idxBottomRight + 2] = clamp(data[idxBottomRight + 2] + error * 1 / 16);
            }
        }
    }
}

/**
 * Convert Image Data to 1-Bit Color
 * @param {ImageData} imageData
 */
function convertTo1Bit(imageData) {
    const data = imageData.data;
    const threshold = 128;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const newValue = v < threshold ? 0 : 255;
        data[i]     = newValue;
        data[i + 1] = newValue;
        data[i + 2] = newValue;
        // Alpha channel remains unchanged
    }
}

/**
 * Flip Image Data Horizontally and/or Vertically
 * @param {ImageData} imageData
 * @param {boolean} horizontal
 * @param {boolean} vertical
 */
function flipImage(imageData, horizontal, vertical) {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Create a copy of the current data
    const copy = new Uint8ClampedArray(data);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let srcX = x;
            let srcY = y;

            if (horizontal) {
                srcX = width - x - 1;
            }
            if (vertical) {
                srcY = height - y - 1;
            }

            const srcIdx = (srcY * width + srcX) * 4;
            const destIdx = (y * width + x) * 4;

            data[destIdx]     = copy[srcIdx];
            data[destIdx + 1] = copy[srcIdx + 1];
            data[destIdx + 2] = copy[srcIdx + 2];
            data[destIdx + 3] = copy[srcIdx + 3];
        }
    }
}

/**
 * Remove Transparency by Setting Transparent Pixels to White
 * @param {ImageData} imageData
 */
function removeTransparency(imageData) {
    const data = imageData.data;
    const length = data.length;

    for (let i = 0; i < length; i += 4) {
        if (data[i + 3] === 0) { // If alpha is 0
            data[i]     = 255; // Red
            data[i + 1] = 255; // Green
            data[i + 2] = 255; // Blue
            data[i + 3] = 255; // Alpha
        }
    }
}

/**
 * Convert Image Data to Hex String
 * @returns {string} Hexadecimal representation of the image
 */
function convertToHex() {
    let bitmap = '';
    let hexData = '';
    let orientation = null;

    if (document.getElementById("landscape").checked) {
        orientation = "landscape";
    } else if (document.getElementById("portrait").checked) {
        orientation = "portrait";
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const height = imageData.height;
    const width = imageData.width;

    let bitmapArray = [];
    for (let y = 0; y < height; y++) {
        let row = '';
        for (let x = 0; x < width; x++) {
            const index = (x + y * width) * 4;
            if (data[index] === 0) {
                row += '0';  // Black pixel
            } else {
                row += '1';  // White pixel
            }
        }
        bitmapArray.push(row);
    }

    // Rotate bitmap if orientation is landscape
    if (orientation === "landscape") {
        let rotatedBitmap = [];

        for (let x = 0; x < width; x++) {
            let newRow = '';
            for (let y = height - 1; y >= 0; y--) {
                newRow += bitmapArray[y][x];
            }
            rotatedBitmap.push(newRow);
        }

        bitmapArray = rotatedBitmap;
    }

    // Join bitmap rows with '000000' as separator
    bitmap = bitmapArray.join('000000');

    // Convert binary string to hexadecimal
    hexData = binaryToHex(bitmap);

    return hexData.toUpperCase();
}

/**
 * Convert Binary String to Hexadecimal String
 * @param {string} binaryStr
 * @returns {string} Hexadecimal string
 */
function binaryToHex(binaryStr) {
    let hexStr = '';

    for (let i = 0; i < binaryStr.length; i += 4) {
        let chunk = binaryStr.substring(i, i + 4);
        if (chunk.length < 4) {
            chunk = chunk.padEnd(4, '0'); // Pad with zeros if less than 4 bits
        }
        hexStr += parseInt(chunk, 2).toString(16).toUpperCase();
    }

    return hexStr;
}

/**
 * Update Connection Status
 * @param {boolean} connected
 */
function updateConnectionStatus(connected) {
    if (connected) {
        connectButton.classList.add('connected');
        connectButton.innerText = "Disconnect from Label";

        // Remove previous event listeners to avoid multiple bindings
        connectButton.replaceWith(connectButton.cloneNode(true));
        const newConnectButton = document.getElementById('connectToLabelButton');

        newConnectButton.addEventListener('click', function () {
            updateConnectionStatus(false);
        });

        sendButton.classList.remove('disabled');
    } else {
        connectButton.classList.remove('connected');
        connectButton.innerText = "Connect to Label";

        // Remove previous event listeners to avoid multiple bindings
        connectButton.replaceWith(connectButton.cloneNode(true));
        const newConnectButton = document.getElementById('connectToLabelButton');

        newConnectButton.addEventListener('click', function () {
            updateConnectionStatus(true);
        });

        sendButton.classList.add('disabled');
    }
}

/**
 * Helper Function to Fill Progress Bar Button (Optional)
 * @param {number} percentage
 */
function fillProgressBarButton(percentage){
    const progressBar = document.getElementById('sendToLabelButton');
    // Fill the button with color based on the percentage
    progressBar.style.background = `linear-gradient(to right, #007aff ${percentage}%, #ccc ${percentage}%)`;
}
