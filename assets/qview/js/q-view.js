let vscode, saveFileTypeSelector, viewer, table, isReady;
const overridden_types = {
    types: {
        float: {
            filter_operator: "==",
            aggregate: "sum",
            format: {
                style: "decimal",
                minimumFractionDigits: 2,
                maximumFractionDigits: 7
            }
        },
        string: {
            filter_operator: "==",
            aggregate: "count"
        },
        integer: {
            filter_operator: "==",
            aggregate: "sum",
            format: {}
        },
        boolean: {
            filter_operator: "==",
            aggregate: "count"
        },
        datetime: {
            filter_operator: "==",
            aggregate: "count",
            format: {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                fractionalSecondDigits: 3,
                hourCycle: "h23",
            },
        },
        time: {
            filter_operator: "==",
            aggregate: "count",
            type: "datetime",
            format: {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                fractionalSecondDigits: 3,
                hourCycle: "h23",
            },
            null_value: -1
        },
        minute: {
            filter_operator: "==",
            aggregate: "count",
            type: "datetime",
            format: {
                hour: "2-digit",
                minute: "2-digit",
                hourCycle: "h23",
            },
            null_value: -1
        },
        second: {
            filter_operator: "==",
            aggregate: "count",
            type: "datetime",
            format: {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hourCycle: "h23",
            },
            null_value: -1
        },
        date: {
            filter_operator: "==",
            aggregate: "count",
            format: {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            },
            null_value: -1
        },
        month: {
            filter_operator: "==",
            aggregate: "count",
            type: "date",
            format: {
                year: "numeric",
                month: "2-digit",
            },
            null_value: -1
        }
    }
};

const worker = perspective.worker(overridden_types);

// get api to interact with vscode
vscode = acquireVsCodeApi();

// add vscode message handler
window.addEventListener('message', event => {
    const message = event.data;
    console.log(`got a vscode message, type: ${message.type}`);
    switch (message.type) {
        // raw byte array
        case 'rba':
        case 'json':
            loadData(message);
            break;
    }
});

// init viewer when ready
window.addEventListener('DOMContentLoaded', async function () {
    console.log('DOM Content is loaded');
    saveFileTypeSelector = document.getElementById('save-file-type-selector');
    viewer = document.getElementsByTagName('perspective-viewer')[0];
    viewer.toggleConfig();
    try {
        // request first data update
        vscode.postMessage({ cmd: 'ready' });
        isReady = true;
        viewer.load(table)
            .then(_ => {
                viewer.reset();
                updateStats();
            });
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
        document.getElementById('data-view-stats').value = `Row ${rowCount}, Col ${colCount}`;
    });
}

// load data to table(required for offline) and to viewer
function loadData(msg) {
    try {
        switch (msg.type) {
            case 'rba':
                table = worker.table(Uint8Array.from(msg.data).buffer);
                break;
            case 'json':
                table = worker.table(msg.meta);
                table.update(msg.data);
                break;
        }
        if (isReady) {
            viewer.load(table)
                .then(_ => {
                    viewer.reset();
                    updateStats();
                });
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
