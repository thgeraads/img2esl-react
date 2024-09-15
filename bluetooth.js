let bleDevice;
let gattServer;
let Theservice;
let writeCharacteristic;
let writeCharacteristicImg;
let reconnectTrys = 0;

let imgArray = "";
let imgArrayLen = 0;
let uploadPart = 0;

function resetVariables() {
    gattServer = null;
    Theservice = null;
    writeCharacteristic = null;
    writeCharacteristicImg = null;
    document.getElementById("log").value = '';
    imgArray = "";
    imgArrayLen = 0;
    uploadPart = 0;
}

function handleError(error) {
    console.log(error);
    resetVariables();
    if (bleDevice == null)
        return;
    if (reconnectTrys <= 5) {
        reconnectTrys++;
        connect();
    }
    else {
        addLog("Was not able to connect, aborting");
        reconnectTrys = 0;
    }
}

async function sendCommandImg(cmd) {
    if (writeCharacteristicImg) {
        await writeCharacteristicImg.writeValue(cmd);
    }
}

async function sendCommand(cmd) {
    if (writeCharacteristic) {
        await writeCharacteristic.writeValue(cmd);
    }
}

async function sendcmd(cmdTXT) {
    let cmd = hexToBytes(cmdTXT);
    addLog('Send CMD: ' + cmdTXT);
    await sendCommand(cmd);
}

function sendimg(cmdIMG) {
    startTime = new Date().getTime();
    imgArray = cmdIMG.replace(/(?:\r\n|\r|\n|,|0x| )/g, '');
    imgArrayLen = imgArray.length;
    uploadPart = 0;
    console.log('Sending image ' + imgArrayLen);
    sendCommand(hexToBytes("0000")).then(() => {
        sendCommand(hexToBytes("020000")).then(() => {
            sendIMGpart();
        })
    })
        .catch(handleError);
}

function sendIMGpart() {
    if (imgArray.length > 0) {
        let currentpart = "03" + imgArray.substring(0, 480);
        imgArray = imgArray.substring(480);
        setStatus('Current part: ' + uploadPart++ + " Time: " + (new Date().getTime() - startTime) / 1000.0 + "s");
        console.log('Curr Part: ' + currentpart);
        sendCommand(hexToBytes(currentpart)).then(() => {
            sendIMGpart();
        })
    } else {
        console.log('Last Part: ' + imgArray);
        sendCommand(hexToBytes("01")).then(() => {
            console.log("Update was send Time: " + (new Date().getTime() - startTime) / 1000.0 + "s");
            setStatus("Update was send in: " + (new Date().getTime() - startTime) / 1000.0 + "s");
        })
    }
}

function disconnect() {
    resetVariables();
    addLog('Disconnected.');
    // document.getElementById("connectbutton").innerHTML = 'Connect';
}

function preConnect() {
    if (gattServer != null && gattServer.connected) {
        if (bleDevice != null && bleDevice.gatt.connected)
            bleDevice.gatt.disconnect();
    }
    else {
        connectTrys = 0;
        navigator.bluetooth.requestDevice({ optionalServices: ['13187b10-eba9-a3ba-044e-83d3217d9a38'], acceptAllDevices: true }).then(device => {
            device.addEventListener('gattserverdisconnected', disconnect);
            bleDevice = device;
            connect();
        }).catch(handleError);
    }
}

function reConnect() {
    connectTrys = 0;
    if (bleDevice != null && bleDevice.gatt.connected)
        bleDevice.gatt.disconnect();
    resetVariables();
    addLog("Reconnect");
    setTimeout(function () { connect(); }, 300);
}

function connect() {
    if (writeCharacteristic == null) {
        addLog("Connecting to: " + bleDevice.name);
        bleDevice.gatt.connect().then(server => {
            console.log('> Found GATT server');
            gattServer = server;
            return gattServer.getPrimaryService('13187b10-eba9-a3ba-044e-83d3217d9a38');
        }).then(service => {
            console.log('> Found service');
            Theservice = service;
            return Theservice.getCharacteristic('4b646063-6264-f3a7-8941-e65356ea82fe');
        }).then(characteristic => {
            addLog('> Found write characteristic');
            // document.getElementById("connectbutton").innerHTML = 'Disconnected';
            updateConnectionStatus(true); // script.js
            writeCharacteristic = characteristic;
            return;
        }).catch(handleError);
    }
}

function setStatus(statusText) {
    // document.getElementById("status").innerHTML = statusText;
}

function addLog(logTXT) {
    var today = new Date();
    var time = ("0" + today.getHours()).slice(-2) + ":" + ("0" + today.getMinutes()).slice(-2) + ":" + ("0" + today.getSeconds()).slice(-2) + " : ";
    // document.getElementById("log").innerHTML += time + logTXT + '<br>';
    console.log(time + logTXT);
    // while ((document.getElementById("log").innerHTML.match(/<br>/g) || []).length > 10) {
    //     var logs_br_position = document.getElementById("log").innerHTML.search("<br>");
        // document.getElementById("log").innerHTML = document.getElementById("log").innerHTML.substring(logs_br_position + 4);
    // }
}

function hexToBytes(hex) {
    for (var bytes = [], c = 0; c < hex.length; c += 2)
        bytes.push(parseInt(hex.substr(c, 2), 16));
    return new Uint8Array(bytes);
}

function bytesToHex(data) {
    return new Uint8Array(data).reduce(
        function (memo, i) {
            return memo + ("0" + i.toString(16)).slice(-2);
        }, "");
}

function intToHex(intIn) {
    var stringOut = "";
    stringOut = ("0000" + intIn.toString(16)).substr(-4)
    return stringOut.substring(2, 4) + stringOut.substring(0, 2);
}