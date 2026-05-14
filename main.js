// Do not use 'use strict' here, because it causes errors in the page scripts when accessing window.CDNPlayerInfo
if (document.getElementById('player')) {
	(() => {
		addEventListener('getCDNPlayerInfo', getCDNPlayerInfoHandler)

		function getCDNPlayerInfoHandler(e) {
			console.log('MAIN received', e)
			const { callback, parameters } = e.detail
			const details = {}
			try {
				const result = getCDNPlayerInfo(parameters)
				details.result = result
			} catch (error) {
				details.error = error
			}
			dispatchEvent(new CustomEvent(callback, { detail: details }))
		}	

		function getCDNPlayerInfo(parameters) {
			const result = {}
			if (typeof CDNPlayer !== 'undefined') {
				result.quality = CDNPlayer.api('quality')
			}
			if (typeof CDNPlayerInfo === 'undefined') {
				if (typeof sof !== 'undefined' && typeof sof.tv !== 'undefined' && typeof sof.tv.getCDNPlayerInfo === 'function') {
					let CDNPlayerInfo = sof.tv.getCDNPlayerInfo()
					result.streams = CDNPlayerInfo.streams
					result.subtitle = CDNPlayerInfo.subtitle
					result.subtitle_def = CDNPlayerInfo.subtitle_def
					result.subtitle_lns = CDNPlayerInfo.subtitle_lns
				}
			}
			else {
				result.streams = CDNPlayerInfo.streams
				result.subtitle = CDNPlayerInfo.subtitle
				result.subtitle_def = CDNPlayerInfo.subtitle_def
				result.subtitle_lns = CDNPlayerInfo.subtitle_lns
			}
			return result
		}

		console.log('MAIN.end script loaded')
	})()
}
