function requestPausedHandler(source, params) {
    console.log('Request paused', source, params)
    const { requestId, responseErrorReason } = params
    if (responseErrorReason) {
        chrome.debugger.sendCommand(source, 'Fetch.failRequest', { requestId: requestId, errorReason: responseErrorReason })
    } else {
        const { responseStatusCode, responseStatusText, responseHeaders } = params

        chrome.debugger.sendCommand(source, "Fetch.getResponseBody", { requestId: requestId })
        .then(({body, base64Encoded}) => {
            if (base64Encoded) {
                body = atob(body)
            } else {
                body = decodeURIComponent(body)
            }
            
            const pos = body.indexOf('pub.initCDNMoviesEvents=')
            if (pos !== -1 && !body.includes('pub.getCDNPlayerInfo')) {
                body = body.substring(0, pos) +
                    `pub.getCDNPlayerInfo=function(){return CDNPlayerInfo}
                    `
                    + body.substring(pos)
                console.log('Response body replaced')
            }
            
            chrome.debugger.sendCommand(source, "Fetch.fulfillRequest", {
                requestId: requestId,
                responseCode: responseStatusCode,
                responsePhrase: responseStatusText,
                responseHeaders: responseHeaders,
                body: (base64Encoded ? btoa(body) : body)
            })
        })
        .catch((error) => {
            console.error(error)
            chrome.debugger.sendCommand(source, 'Fetch.failRequest', { requestId: requestId, errorReason: 'Failed' })
        })
    }
}

function onCommittedHandler(details) {
    const target = { tabId: details.tabId }

    chrome.debugger.attach(target, '1.3')
    .then(() => {
        console.log('Debugger attached to', target)
        chrome.debugger.sendCommand(target, 'Fetch.enable', {
            patterns: [
                {
                    urlPattern: '*/j/script*js',
                    resourceType: 'Script',
                    requestStage: 'Response'
                }
            ]})
        .then(() => {
            console.log('Fetch domain enabled for', target)
        }).catch(error => {
            console.error(error)
        })
    }).catch(error => {
        console.error(error)
    })
}

function onMessageHandler(message, sender, sendResponse) {
    if (message?.method === 'download') {
        chrome.downloads.download({ url: message.url, filename: message.filename, conflictAction: 'prompt', saveAs: true })
        .then( downloadId => {
            console.log('Download started, ID:', downloadId)
            const response = { downloadId }
            sendResponse(response)
        })
        .catch(error => {
            throw new Error(chrome.runtime.lastError)
        })
    }
}

chrome.debugger.onEvent.addListener((source, method, params) => {
    // console.log('Debugger event', source, method, params)
    if (method === 'Fetch.requestPaused') {
        requestPausedHandler(source, params)
    }
})

chrome.webNavigation.onCommitted.addListener(onCommittedHandler, { url: [{ hostContains: 'rezka' }] })

chrome.runtime.onMessage.addListener(onMessageHandler)
