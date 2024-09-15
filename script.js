const imageUpload = document.getElementById('imageUpload');
let originalImageData = null; // Store original image data
let originalImage = null;     // Store the original image element for redrawing
let imageData = null;     // Store processed image data (resized or modified image)

const ditherBox = document.getElementById('dither');
ditherBox.addEventListener('change', function () {
    redrawCanvas(); // Redraw the canvas when settings change
});

const brightnessSlider = document.getElementById('brightness');
brightnessSlider.addEventListener('input', function () {
    redrawCanvas(); // Redraw from the processed image when settings change
});

const bitmapBox = document.getElementById('bitmap');
bitmapBox.addEventListener('change', function () {
    redrawCanvas(); // Redraw from the processed image whenever settings change
});

const displaySelector = document.getElementById('displayType');
displaySelector.addEventListener('change', function () {
    resizeImage(); // Resize based on the display selection
});

const orientationRadios = document.querySelectorAll("input[name='orientation']");
orientationRadios.forEach(radio => {
    radio.addEventListener('change', function () {
        resizeImage(); // Resize when orientation changes
    });
});

function handleImage() {
    const reader = new FileReader();
    reader.onload = function (event) {
        loadOriginalImage(event.target.result);
    }
    reader.readAsDataURL(imageUpload.files[0]);
}

function resizeImage() {
    const displayType = displaySelector.value;
    const portraitCheck = document.getElementById("portrait").checked;
    const landscapeCheck = document.getElementById("landscape").checked;
    const canvas = document.getElementById('modifiedImage');
    const ctx = canvas.getContext('2d');

    if (!portraitCheck && !landscapeCheck) {
        alert("Please select a display orientation");
        return;
    }

    // Determine the appropriate size based on the orientation
    let width, height;
    if (portraitCheck) {
        if (displayType === "MN@") {
            width = 122;
            height = 250;
        }
    } else if (landscapeCheck) {
        if (displayType === "MN@") {
            width = 250;
            height = 122;
        }
    }

    // Resize the canvas to fit the new dimensions
    canvas.width = width;
    canvas.height = height;

    // Clear the canvas and scale the image to fit within the resized canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate aspect ratio to resize the image proportionally
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

    // Draw the image centered on the canvas
    const offsetX = (canvas.width - targetWidth) / 2;
    const offsetY = (canvas.height - targetHeight) / 2;
    ctx.drawImage(originalImage, 0, 0, originalImage.width, originalImage.height, offsetX, offsetY, targetWidth, targetHeight);

    // Save resized image data
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    redrawCanvas(); // Apply effects like brightness or dithering after resizing
}

function loadOriginalImage(imageSrc) {
    const canvas = document.getElementById('modifiedImage');
    const ctx = canvas.getContext('2d');
    originalImage = new Image();

    originalImage.onload = function () {
        canvas.width = originalImage.width;
        canvas.height = originalImage.height;
        ctx.drawImage(originalImage, 0, 0);

        // Save the original image data after loading the image
        originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        imageData = originalImageData; // Initialize imageData with the original data

        // Automatically resize the image after it loads
        resizeImage();
    }

    originalImage.src = imageSrc;
}

function redrawCanvas() {
    const canvas = document.getElementById('modifiedImage');
    const ctx = canvas.getContext('2d');

    // Reset the canvas to the resized image before applying any modifications
    ctx.putImageData(imageData, 0, 0);

    // Apply brightness adjustment
    if (brightnessSlider.value !== 100) {
        setBrightness(brightnessSlider.value);
    }

    // Apply dithering if checked
    if (ditherBox.checked) {
        ditherImage();
    }

    // Convert to 1-bit if the bitmap option is checked
    if (bitmapBox.checked) {
        convertTo1Bit();
    }

    removeTransparency();
}

function setBrightness(brightness) {
    const canvas = document.getElementById('modifiedImage');
    const ctx = canvas.getContext('2d');
    const adjustedData = ctx.getImageData(0, 0, canvas.width, canvas.height); // Work with a fresh copy of the original image
    const data = adjustedData.data;
    const brightnessFactor = brightness / 100;

    for (let i = 0; i < data.length; i += 4) {
        data[i] = data[i] * brightnessFactor;     // Red
        data[i + 1] = data[i + 1] * brightnessFactor; // Green
        data[i + 2] = data[i + 2] * brightnessFactor; // Blue
    }

    ctx.putImageData(adjustedData, 0, 0);
}

function ditherImage() {
    const canvas = document.getElementById('modifiedImage');
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const oldPixel = data[i];  // Red channel (you could also take an average of RGB)
        const newPixel = oldPixel < 128 ? 0 : 255;  // Threshold to black or white
        const error = oldPixel - newPixel;

        // Set the current pixel to black or white
        data[i] = data[i + 1] = data[i + 2] = newPixel;  // RGB set to either 0 or 255

        // Distribute the error to neighboring pixels (Floyd-Steinberg dithering)
        if (i + 4 < data.length) data[i + 4] += error * 7 / 16; // Right neighbor
        if (i + 4 * canvas.width - 4 < data.length) data[i + 4 * canvas.width - 4] += error * 3 / 16; // Bottom-left neighbor
        if (i + 4 * canvas.width < data.length) data[i + 4 * canvas.width] += error * 5 / 16; // Bottom neighbor
        if (i + 4 * canvas.width + 4 < data.length) data[i + 4 * canvas.width + 4] += error * 1 / 16; // Bottom-right neighbor
    }

    // Put the modified image data back into the canvas
    ctx.putImageData(imageData, 0, 0);
}

function convertTo1Bit() {
    const canvas = document.getElementById('modifiedImage');
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const threshold = 128;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const newValue = v < threshold ? 0 : 255;
        data[i] = data[i + 1] = data[i + 2] = newValue;
    }

    ctx.putImageData(imageData, 0, 0);
}


function updateConnectionStatus(connected) {
    if (connected) {
        document.getElementById('connectToLabelButton').classList.add('connected');
        document.getElementById("connectToLabelButton").innerText = "Disconnect from Label";
        document.getElementById('connectToLabelButton').removeEventListener('click', function () {
                updateConnectionStatus(true);
            }
        );
        document.getElementById('connectToLabelButton').addEventListener('click', function () {
            updateConnectionStatus(false);
        });
        document.getElementById('sendToLabelButton').classList.remove('disabled');
    } else {
        document.getElementById('connectToLabelButton').classList.remove('connected');
        document.getElementById("connectToLabelButton").innerText = "Connect to Label";
        document.getElementById('connectToLabelButton').removeEventListener('click', function () {
                updateConnectionStatus(false);
            }
        );
        document.getElementById('connectToLabelButton').addEventListener('click', function () {
            updateConnectionStatus(true);
        });
        document.getElementById('sendToLabelButton').classList.add('disabled');
    }
}

// Attach the event listener to handle image upload
imageUpload.addEventListener('change', handleImage, false);
window.onload = function () {
    document.getElementById("landscape").checked = true;
    document.getElementById("bitmap").checked = true;
    document.getElementById("bitmap").disabled = true;

}

function removeTransparency() {
    const image = document.getElementById('modifiedImage');
    const ctx = image.getContext('2d');
    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    const data = imageData.data;
    const height = image.height;
    const width = image.width;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = (x + y * width) * 4;
            if (data[index + 3] === 0) {
                // set pixel to white
                data[index] = 255;
                data[index + 1] = 255;
                data[index + 2] = 255;
                data[index + 3] = 255;
            }

        }
    }
    ctx.putImageData(imageData, 0, 0);
}

function convertToHex() {
    let bitmap = '';
    let hexData = '';
    let data = null;
    let image = null;
    let orientation = null;

    if (document.getElementById("landscape").checked) {
        orientation = "landscape";
    } else if (document.getElementById("portrait").checked) {
        orientation = "portrait";
    }

    image = document.getElementById('modifiedImage');
    const ctx = image.getContext('2d');
    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    data = imageData.data;

    const height = image.height;
    const width = image.width;

    var bitmapArray = [];
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

    // Check if orientation is landscape
    if (orientation === "landscape") {
        let rotatedBitmap = [];

        // Loop through columns (width)
        for (let x = 0; x < width; x++) {
            let newRow = '';
            // For each column, get the pixel from the last row first, moving upwards
            for (let y = height - 1; y >= 0; y--) {
                newRow += bitmapArray[y][x];
            }
            rotatedBitmap.push(newRow);
        }

        // Now, the rotatedBitmap array is the rotated version of the bitmap
        bitmapArray = rotatedBitmap;
    }

    // Convert the rotated (or original) bitmapArray back into a single string
    bitmap = bitmapArray.join('000000');

    // Convert the bitmap to hex
    hexData = binaryToHex(bitmap);

    // Binary to Hex conversion function
    function binaryToHex(binaryString) {
        const paddingLength = (4 - (binaryString.length % 4)) % 4;
        binaryString = binaryString.padStart(binaryString.length + paddingLength, '0');

        let hexString = '';
        for (let i = 0; i < binaryString.length; i += 4) {
            const binaryChunk = binaryString.slice(i, i + 4);
            const hexDigit = parseInt(binaryChunk, 2).toString(16);
            hexString += hexDigit;
        }
        return hexString.toUpperCase();
    }

    return hexData.toUpperCase();
}

