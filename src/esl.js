let bleDevice, gattServer, service, writeCharacteristic;
let reconnectTries = 0;

// Reset connection-related variables
function resetVariables() {
    gattServer = service = writeCharacteristic = null;
    reconnectTries = 0;
}

// Handle errors during connection
function handleError(error) {
    console.error(error);
    resetVariables();
    if (!bleDevice) return;
    if (reconnectTries++ <= 5) {
        connect(); // Try reconnecting up to 5 times
    } else {
        addLog("Unable to connect, aborting");
        reconnectTries = 0;
    }
}

// Function to log messages to console
function addLog(logTxt) {
    const time = new Date().toTimeString().split(' ')[0];
    console.log(`${time}: ${logTxt}`);
}

// Function to disconnect the BLE device
export function disconnect(bluetoothConnectionFunction) {
    resetVariables();
    addLog('Disconnected.');
    eval(bluetoothConnectionFunction(false));  // Trigger disconnection callback
}

// Prepares to connect to the device or disconnect if already connected
export async function connect() {
    try {
        if (gattServer?.connected) {
            // Disconnect if already connected
            bleDevice?.gatt.disconnect();
            resetVariables();
            addLog('Disconnected from device.');
            return false;
        }

        // Request a Bluetooth device with name prefix 'ESL_'
        bleDevice = await navigator.bluetooth.requestDevice({
            filters: [{ namePrefix: 'ESL_' }],
            optionalServices: ['13187b10-eba9-a3ba-044e-83d3217d9a38']  // Service UUID
        });

        // Add event listener for device disconnection
        bleDevice.addEventListener('gattserverdisconnected', () => console.log('Device disconnected'));

        // Connect to GATT server
        gattServer = await bleDevice.gatt.connect();

        // Get the service by UUID
        service = await gattServer.getPrimaryService('13187b10-eba9-a3ba-044e-83d3217d9a38');

        // Get the characteristic by UUID
        writeCharacteristic = await service.getCharacteristic('4b646063-6264-f3a7-8941-e65356ea82fe');

        // Log the successful connection
        addLog('Connected and ready to write.');

        // Return true to indicate successful connection
        return true;

    } catch (error) {
        handleError(error);  // Handle errors
        return false;  // Return false if any error occurs during connection
    }
}

// Function to send hex data to the ESL (Electronic Shelf Label)
export async function sendHexDataToESL(imgHex) {
    try {
        // Prepare the image data by cleaning up the hex string
        let imgArray = imgHex.replace(/(?:\r\n|\r|\n|,|0x| )/g, ''); // Remove unwanted characters
        let imgArrayLen = imgArray.length;
        let uploadPart = 0;
        console.log(`Sending image (${imgArrayLen} bytes)`);

        // Send initialization commands before sending the actual image data
        await sendHexCommand("0000", writeCharacteristic);  // Start transmission
        await sendHexCommand("020000", writeCharacteristic); // Command to prepare for image data

        // Begin sending image data in chunks of 480 hex characters
        while (imgArray) {
            let currentPart = "03" + imgArray.substring(0, 480); // Take the first 480 characters of imgArray
            imgArray = imgArray.substring(480); // Remove the sent part from the imgArray
            console.log(`Sending part ${uploadPart++}`);

            await sendHexCommand(currentPart, writeCharacteristic); // Send the current chunk of image data
        }

        // End transmission
        await sendHexCommand("01", writeCharacteristic); // Final command to complete the image transmission
        console.log(`Update sent successfully`);
    } catch (error) {
        handleError(error);
    }
}

// Helper function to send a hex command to the characteristic
async function sendHexCommand(hexStr, characteristic) {
    const cmd = hexToBytes(hexStr);
    addLog(`Send CMD: ${hexStr}`);
    return sendCommand(cmd, characteristic);
}

// Convert a hex string to bytes (Uint8Array)
function hexToBytes(hex) {
    return new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

// Send a command to the BLE device characteristic
async function sendCommand(cmd, characteristic) {
    if (characteristic) await characteristic.writeValue(cmd);
}
