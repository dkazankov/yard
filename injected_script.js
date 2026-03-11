(() => {
	window.addEventListener("message", (event) => {
		if (event.source !== window) {
			return
		}
		if (event.data.myMessageId) {
			if (event.data.message) {
				if (event.data.message === "getCDNPlayerInfo") {
					window.postMessage({
						myMessageId: event.data.myMessageId,
						response: {
							quality: CDNPlayer?.api('quality'),
							streams: CDNPlayerInfo?.streams,
							subtitle: CDNPlayerInfo?.subtitle,
							subtitle_def: CDNPlayerInfo?.subtitle_def,
							subtitle_lns: CDNPlayerInfo?.subtitle_lns
						}
					})
				}
				else {
					window.postMessage({
						myMessageId: event.data.myMessageId,
						error: "Unknown message"})
				}
			}
		}
	}, false)
})()
