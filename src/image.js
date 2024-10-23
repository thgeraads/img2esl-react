/**
 * Convert ImageData to Hexadecimal Representation, adjusting for orientation, making transparent pixels white, and adding padding
 * @param {ImageData} imageData - Original ImageData object
 * @param {number} width - Desired width of the output
 * @param {number} height - Desired height of the output
 * @returns {string} Hexadecimal representation of the image
 */
export function convertImageDataToHex(imageData, width, height) {
    let data = imageData.data;

    // Detect if the image is in landscape mode and needs to be rotated
    let isLandscape = width > height;
    let bitmapArray = [];

    if (isLandscape) {
        // Rotate the image data 90 degrees clockwise
        [width, height] = [height, width]; // Swap width and height for portrait orientation
        data = rotateImageDataClockwise(imageData);
    }

    // Loop through each pixel to generate binary representation (0 for black, 1 for white)
    for (let y = 0; y < height; y++) {
        let row = '';
        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4; // Each pixel has 4 values (R, G, B, A)
            const r = data[index];      // Red
            const g = data[index + 1];  // Green
            const b = data[index + 2];  // Blue
            const a = data[index + 3];  // Alpha

            // If alpha is 0 (transparent), treat the pixel as white
            if (a === 0) {
                row += '1';  // Transparent pixels are treated as white
            } else {
                // Convert pixel to grayscale
                const grayscale = 0.2126 * r + 0.7152 * g + 0.0722 * b;

                // Add 0 for black, 1 for white
                row += grayscale < 128 ? '0' : '1';
            }
        }
        bitmapArray.push(row);
    }

    // Join bitmap rows with '000000' as separator for padding between rows
    const binaryData = bitmapArray.join('000000');

    // Convert binary string to hexadecimal string
    return binaryToHex(binaryData);
}

/**
 * Rotate the image data 90 degrees clockwise
 * @param {ImageData} imageData - Original ImageData object
 * @returns {Uint8ClampedArray} Rotated image data
 */
function rotateImageDataClockwise(imageData) {
    const oldData = imageData.data;
    const oldWidth = imageData.width;
    const oldHeight = imageData.height;
    const rotatedData = new Uint8ClampedArray(oldWidth * oldHeight * 4);

    for (let y = 0; y < oldHeight; y++) {
        for (let x = 0; x < oldWidth; x++) {
            const oldIndex = (y * oldWidth + x) * 4;
            const newIndex = ((x * oldHeight) + (oldHeight - y - 1)) * 4;

            // Copy pixel data to the rotated position
            rotatedData[newIndex] = oldData[oldIndex];         // Red
            rotatedData[newIndex + 1] = oldData[oldIndex + 1]; // Green
            rotatedData[newIndex + 2] = oldData[oldIndex + 2]; // Blue
            rotatedData[newIndex + 3] = oldData[oldIndex + 3]; // Alpha
        }
    }

    return rotatedData;
}

/**
 * Convert Binary String to Hexadecimal String
 * @param {string} binaryStr - Binary string (from image)
 * @returns {string} Hexadecimal string
 */
function binaryToHex(binaryStr) {
    let hexStr = '';

    // Process the binary string 4 bits at a time and convert to hexadecimal
    for (let i = 0; i < binaryStr.length; i += 4) {
        const chunk = binaryStr.substring(i, i + 4).padEnd(4, '0'); // Pad if necessary
        hexStr += parseInt(chunk, 2).toString(16).toUpperCase();
    }

    return hexStr;
}
