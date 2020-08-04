let vscode, saveFileTypeSelector, viewer;

// get api to interact with vscode
vscode = acquireVsCodeApi();

// add vscode message handler
window.addEventListener('message', event => {
    const message = event.data;
    console.log(`got a vscode message, type: ${message.type}`)
    switch (message.type) {
        // raw byte array
        case 'rba':
        case 'json':
            loadData(message);
            break;
    }
});

// init viewer when ready
window.addEventListener('WebComponentsReady', event => {
    console.log('web components data viewer is ready');
    saveFileTypeSelector = document.getElementById('save-file-type-selector');
    viewer = document.getElementsByTagName('perspective-viewer')[0];
    viewer.toggleConfig();
    try {
        // request first data update
        vscode.postMessage({ cmd: 'ready' });
    }
    catch (error) {
        console.error(`sending msg failed - error: ${error.message}`);
    }
});

// update rows and columns
function updateStats() {
    const numberOfRows = viewer.view ? viewer.view.num_rows() : viewer.table.size();
    // get rows count and displayed columns info
    numberOfRows.then(rowCount => {
        const colCount = viewer['columns'].length;
        // notify webview for data stats status update
        document.getElementById("data-view-stats").value = `Row ${rowCount}, Col ${colCount}`;
    });
}

// load data to table(required for offline) and to viewer
function loadData(msg) {
    try {
        switch (msg.type) {
            case "rba":
                var table = perspective.worker().table(Uint8Array.from(msg.data).buffer);
                viewer.load(table)
                    .then(_ => updateStats());
                break;
            case "json":
                var table = perspective.worker().table(msg.data)
                viewer.load(table)
                    .then(_ => updateStats());;
                break;
        }
    } catch (error) {
        console.error(`loadData - error: ${error.message}`);
    }
}

// save data
function saveData() {
    const dataFileType = saveFileTypeSelector.value;
    switch (dataFileType) {
        case '.csv':
            viewer.view.to_csv().then(csv => sendDataToVscode(csv, dataFileType));
            break;
        case '.xlsx':
            viewer.view.to_json({ date_format: 'en-US' }).then(json => sendDataToVscode(json, dataFileType));
            break;
    }
}


function sendDataToVscode(data, filetype) {
    vscode.postMessage({
        cmd: 'saveData',
        data: data,
        fileType: filetype
    });
}

// function buyCoffee() {
//     vscode.postMessage({
//         command: 'buyCoffee',
//         viewName: 'vscode.open',
//         uri: 'https://www.buymeacoffee.com/jshinonome'
//     });
// }
