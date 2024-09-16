let bleDevice, gattServer, service, writeCharacteristic, writeCharacteristicImg;
let reconnectTries = 0, imgArray = "", imgArrayLen = 0, uploadPart = 0;

function resetVariables() {
    gattServer = service = writeCharacteristic = writeCharacteristicImg = null;
    document.getElementById("log").value = '';
    imgArray = ""; imgArrayLen = uploadPart = 0;
}

function handleError(error) {
    console.error(error);
    resetVariables();
    if (!bleDevice) return;
    if (reconnectTries++ <= 5) connect();
    else addLog("Unable to connect, aborting"), reconnectTries = 0;
}

async function sendCommand(cmd, characteristic) {
    if (characteristic) await characteristic.writeValue(cmd);
}

function sendHexCommand(hexStr, characteristic) {
    const cmd = hexToBytes(hexStr);
    addLog(`Send CMD: ${hexStr}`);
    return sendCommand(cmd, characteristic);
}

function sendImageData(imgHex) {
    imgArray = imgHex.replace(/(?:\r\n|\r|\n|,|0x| )/g, '');
    imgArrayLen = imgArray.length;
    uploadPart = 0;
    console.log(`Sending image (${imgArrayLen} bytes)`);

    sendHexCommand("0000", writeCharacteristic).then(() =>
        sendHexCommand("020000", writeCharacteristic).then(sendNextImgPart)
    ).catch(handleError);
}

function sendNextImgPart() {
    if (!imgArray) {
        sendHexCommand("01", writeCharacteristic).then(() => {
            console.log(`Update sent in ${(new Date().getTime() - startTime) / 1000}s`);
            setStatus(`Update sent in ${(new Date().getTime() - startTime) / 1000}s`);
        });
        return;
    }

    let currentPart = "03" + imgArray.substring(0, 480);
    imgArray = imgArray.substring(480);
    console.log(`Current part: ${uploadPart++}`);
    setStatus(`Current part: ${uploadPart++}`);

    sendHexCommand(currentPart, writeCharacteristic).then(sendNextImgPart);
}

function disconnect() {
    resetVariables();
    addLog('Disconnected.');
    updateConnectionStatus(false);
}

function preConnect() {
    if (gattServer?.connected) {
        bleDevice?.gatt.disconnect();
    } else {
        navigator.bluetooth.requestDevice({
            filters: [{ namePrefix: 'ESL_' }],  // Filter devices with names starting with 'ESL_'
            optionalServices: ['13187b10-eba9-a3ba-044e-83d3217d9a38']
        })
            .then(device => {
                bleDevice = device;
                bleDevice.addEventListener('gattserverdisconnected', disconnect);
                connect();
            })
            .catch(handleError);
    }
}


function reconnect() {
    reconnectTries = 0;
    if (bleDevice?.gatt.connected) bleDevice.gatt.disconnect();
    resetVariables();
    addLog("Reconnecting...");
    setTimeout(connect, 300);
}

function connect() {
    if (!writeCharacteristic) {
        addLog(`Connecting to: ${bleDevice.name}`);
        bleDevice.gatt.connect()
            .then(server => (gattServer = server).getPrimaryService('13187b10-eba9-a3ba-044e-83d3217d9a38'))
            .then(svc => (service = svc).getCharacteristic('4b646063-6264-f3a7-8941-e65356ea82fe'))
            .then(char => {
                writeCharacteristic = char;
                addLog('Connected and ready to write.');
                updateConnectionStatus(true);
            })
            .catch(handleError);
    }
}

function addLog(logTxt) {
    const time = new Date().toTimeString().split(' ')[0];
    console.log(`${time}: ${logTxt}`);
}

function setStatus(statusTxt) {
    console.log(statusTxt);
}

function hexToBytes(hex) {
    return new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

function bytesToHex(bytes) {
    return Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join('');
}