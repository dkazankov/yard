(() => {

	let srcChanged = true
	let myMessageId = 0

	const player = document.getElementById('player')

	if (player) {
		createDownloader().then(() => {
			// Observe changes in the video source to update the download links when a new video is loaded
			let srcPrev = player.getElementsByTagName('video')[0].src
			const observer = new MutationObserver((mutationList, observer) => {
				try {
					const src = player.getElementsByTagName('video')[0].src
					if (srcPrev !== src) {
						srcPrev = src
						srcChanged = true
					}
				} catch (error) {
					console.error(error)
				}
			})
			observer.observe(document.querySelector('body'), { childList: true, subtree: true })
		}).catch(error => {
			console.error('Error creating downloader', error)
		})
	}

	function sendMessage(message, responseHandler, errorHandler) {
		myMessageId += 1
		const id = myMessageId
		if (responseHandler) {
			function responseListener(event) {
				if (event.source !== window) {
					return
				}
				if (event.data.myMessageId === id) {
					if (event.data.message) {
						return
					}
					window.removeEventListener("message", responseListener)
					if (event.data.error) {
						if (errorHandler) {
							errorHandler(event.data.error)
						}
					}
					if (event.data.response) {
						responseHandler(event.data.response)
					}
				}
			}
			window.addEventListener("message", responseListener)
		}
		window.postMessage({myMessageId: id, message})
		return true
	}

	async function createDownloader() {
		const sendVideoIssue = document.getElementById('send-video-issue')
		const parentNode = sendVideoIssue.parentNode

		let downloader = document.getElementById('MyDownloader')
		if (!downloader) {
			downloader = document.createElement('div')
			downloader.id = 'MyDownloader'
			parentNode.insertBefore(downloader, sendVideoIssue)

			// Inject the script to access page variables
			const script_element = document.createElement('script')
			script_element.src = chrome.runtime.getURL("injected_script.js")
			script_element.onload = () => script_element.remove()
			document.body.appendChild(script_element);

			// Create the download menu
			const menu_element = await createDownloadMenu(chrome.runtime.getURL("assets/download_menu.html"))
			downloader.appendChild(menu_element)

			// Create the download button
			const button_element = await createDownloadButton(chrome.runtime.getURL("assets/download_button.html"))
			downloader.appendChild(button_element)

			const link_element = await createElementFromHTML(chrome.runtime.getURL("assets/download_link.html"))
			link_element.title = chrome.i18n.getMessage("download_link_description")

			const control_element = await createElementFromHTML(chrome.runtime.getURL("assets/download_control.html"))
			control_element.lastElementChild.title = chrome.i18n.getMessage("cancel")

			const size_element = await createElementFromHTML(chrome.runtime.getURL("assets/file_size.html"))

			async function createElementFromHTML(url) {
				const response = await fetch(url)
				if (!response.ok) {
					throw new Error(response.statusText, { cause: response.status })
				}
				const element = document.createElement('div')
				element.innerHTML = await response.text()
				return element.firstElementChild
			}

			async function createDownloadMenu(url) {
				const element = await createElementFromHTML(url)
				const summary = element.querySelector('summary')
				summary.onmouseover = () => {
					summary.style.background = 'blueviolet'
				}
				summary.onmouseout = () => {
					summary.style.background = null
				}
				summary.firstElementChild.innerText = chrome.i18n.getMessage("subtitles")
				return element
			}

			async function createDownloadButton(url) {
				const element = await createElementFromHTML(url)
				element.title = chrome.i18n.getMessage("download")
				element.firstElementChild.src = chrome.runtime.getURL("assets/download.svg")
				element.onmouseover = () => {
					element.style.background = '#013220'
				}
				element.onmouseout = () => {
					element.style.background = '#32cd32'
				}
				element.onclick = () => {
					if (menu_element.style.display === 'none') {
						resetDownloaderList().then(() => {
							menu_element.style.transform = 'scale(1)'
							menu_element.style.opacity = 1
							menu_element.style.display = 'block'
							document.body.addEventListener('click', buttonOnClick)
						})
					} else {
						menu_element.style.transform = 'scale(0)'
						menu_element.style.opacity = 0
						menu_element.style.display = 'none'
						document.body.removeEventListener('click', buttonOnClick)
					}
					function buttonOnClick(event) {
						const path = event.path || (event.composedPath && event.composedPath());
						if (!path.includes(menu_element) && !path.includes(button_element)) {
							document.body.removeEventListener('click', buttonOnClick)
							menu_element.style.transform = 'scale(0)'
							menu_element.style.opacity = 0
							menu_element.style.display = 'none'
						}
					}
				}
				return element
			}

			function createDownloaderControl(abortController) {
				const area = control_element.cloneNode(true)
				const closeButton = area.lastElementChild
				closeButton.onclick = () => {
					abortController.abort()
				}
				closeButton.onmouseover = () => {
					closeButton.style.borderColor = "red"
				}
				closeButton.onmouseout = () => {
					closeButton.style.borderColor = "transparent"
				}
				return area
			}

			function createDownloadLink(url, fileName, type, title) {
				const a = link_element.cloneNode(true)
				a.href = url
				a.download = fileName
				a.type = type
				a.firstElementChild.innerText = title
				a.onmouseover = () => {
					a.style.background = 'rgb(0, 0, 255, 0.75)'
				}
				a.onmouseout = () => {
					a.style.background = null
				}
				a.onclick = (event) => {
					event.preventDefault()
					if (a.type === undefined || a.type === '') {
						return
					}
					if (a.classList.contains('downloading')) {
						return
					}
					a.classList.add('downloading')

					let extension = ''
					let types = []
					if (a.type === 'video/mp4') {
						extension = '.mp4'
						types.push({ description: 'MP4 video', accept: { 'video/mp4': ['.mp4'] } })
					} else if (a.type === 'text/vtt') {
						extension = '.vtt'
						types.push({ description: 'VTT subtitles', accept: { 'text/vtt': ['.vtt'] } })
					}

					startFileDownloader(extension, types)

					async function startFileDownloader(extension, types) {
						try {
							const handle = await showSaveFilePicker({ suggestedName: a.download + extension, types })

							const controller = new AbortController()
							const area = createDownloaderControl(controller)
							const progress = area.firstElementChild
							const percentage = progress.nextElementSibling
							a.appendChild(area)

							try {
								await downloadFile(a.href, handle, {
									signal: controller.signal, onprogress: ({percent}) => {
										progress.value = percent;
										percentage.innerText = percent + "%"
									}
								})
							} catch (error) {
								if (error.name !== 'AbortError') {
									console.error(error)
								}
								if (error.name === 'AbortError') {
									const name = handle.name
									handle.remove()
									console.error('File download aborted, file "'+name+'" removed')
								}
							}
							area.remove()
							a.classList.remove('downloading')
						} catch (error) {
							if (error.name !== 'AbortError') {
								console.error(error)
							}
							a.classList.remove('downloading')
						}
					}
				}

				const element = size_element.cloneNode(true)
				if (url.host.includes('stream.voidboost') || type === 'text/vtt') {
					getRemoteFileSize(url)
					.then(size => {
						element.innerText = formatBytes(size, 1)
					})
					.catch(error => {
						console.error('Error getting size for '+url, error)
						element.innerText = formatBytes(0, 1)
					})
				}
				a.replaceChild(element, a.lastElementChild)
				return a
			}

			function removeOldLinks(start) {
				let element = start
				while (element) {
					const next = element.nextElementSibling
					if (element.tagName === 'A') {
						if (element.classList.contains('downloading')) {
							element.classList.add('remove')
						} else {
							element.remove()
						}
					}
					element = next
				}
			}

			async function resetDownloaderList() {
				if ( !srcChanged ) {
					return
				}
				srcChanged = false

				const svg = menu_element.firstElementChild
				const list = svg.nextElementSibling
				const details = menu_element.lastElementChild
				const summary = details.firstElementChild

				removeOldLinks(list.firstElementChild)
				removeOldLinks(summary.nextElementSibling)

				const template = '%title-s%seasone%episode-%translation-%resolution'

				const info = await getVideoInfo()

				for (const stream of info.streams) {
					const fileName = instantiateTemplate(template, {...info, title: info.originalTitle, resolution: stream.quality})
					let i = 0
					for (const link of stream.links) {
						const url = new URL(link.trim())
						if (url.pathname.includes(':hls:')) {
							continue
						}
						i++
						const a = createDownloadLink(url, fileName, 'video/mp4', stream.quality + " #" + i + " @" + url.hostname)
						list.appendChild(a)
					}
				}
				if ( info.streams.length === 0 ) {
					const a = createDownloadLink('#', '', '', 'Incorrect streams')
					list.appendChild(a)
				}

				for (const subtitle of info.subtitles) {
					const fileName = instantiateTemplate(template, {...info, title: info.originalTitle, translation: subtitle.lang, resolution: null})
					const url = new URL(subtitle.link.trim())
					const a = createDownloadLink(url, fileName, 'text/vtt', subtitle.lang)
					details.appendChild(a)
				}
				if ( info.subtitles.length > 0 ) {
					summary.lastElementChild.innerText = ''+info.subtitles.length
				}

				svg.style.display = (list.childElementCount > 1 || details.childElementCount > 1 ? 'none': 'block')
				list.style.display = (list.childElementCount > 1 ? 'block': 'none')
				details.style.display = (details.childElementCount > 1 ? 'block': 'none')
			}
		}
	}

	function getVideoInfo() {
		let info = {}

		let element = document.querySelector('#simple-episodes-tabs .active')
		if (element) {
			info.season = element.getAttribute('data-season_id')
			info.episode = element.getAttribute('data-episode_id')
		}
		element = document.querySelector('.b-translator__item.active')
		if (element) {
			info.translator_id = element.getAttribute('data-translator_id')
		}
		element = document.querySelector('#translators-list .active')
		if (element) {
			info.translation = element.innerText.trim()
		}
		element = document.querySelector('.b-content__main .b-post__title')
		if (element) {
			info.title = element.innerText.trim()
		}
		element = document.querySelector('.b-content__main .b-post__origtitle')
		if (element) {
			info.originalTitle = element.innerText.trim()
		}

		element = document.getElementById('ctrl_favs')
		if (element) {
			info.favs = element.getAttribute('value')
		}

		return new Promise((resolve) => {
			sendMessage("getCDNPlayerInfo", (response) => {
				info.quality = response.quality
				info.streams = []
				info.subtitles = []
				info.subtitle_def = response.subtitle_def
				info.subtitle_lns = response.subtitle_lns
				if ( response.streams ) {
					const streams = response.streams.split(',')
					for (const stream of streams) {
						const temp = stream.split('[')[1].split(']')
						const quality = temp[0]
						const links = temp[1].split(' or ')
						info.streams.push({quality, links})
					}
				}
				if ( response.subtitle ) {
					const subtitles = response.subtitle.split(',')
					for (const subtitle of subtitles) {
						const temp = subtitle.split('[')[1].split(']')
						const lang = temp[0]
						const link = temp[1]
						info.subtitles.push({lang, link})
					}
				}
				resolve(info)
			})
		})
	}

	function formatBytes(bytes, decimals = 2) {
		if (bytes === NaN) return 'Unknown'
		if (bytes === 0) return '0 Bytes'
		const k = 1024
		const dm = decimals < 0 ? 0 : decimals
		const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
	}

	function instantiateTemplate(template, values) {
		let instance = ''
		if (!template) {
			return instance
		}
		instance = template
		for (const key in values) {
			const value = values[key]
			instance = instance.replaceAll('%'+key, (value? value: ''))
		}
		return instance.replaceAll(':', '_').replaceAll('/', '_').replaceAll('.', '_').replaceAll(' ', '_')
	}

	async function getRemoteFileSize(url) {
		const response = await fetch(url, { method: 'HEAD' })
		const size = response.headers.get('content-length')
		return +size
	}

	async function downloadFile(url, handle, {signal, onprogress}) {
		const response = await fetch(url, {signal})
		if (!response.ok) {
			throw new Error(response.statusText, { cause: response.status })
		}
		const writable = await handle.createWritable()
		const length = +response.headers.get('content-length')
		let countBytes = 0
		let countChunks = 0
		const transform = new TransformStream({
			transform(chunk, controller) {
				controller.enqueue(chunk)
				if ( onprogress ) {
					countChunks++
					countBytes += chunk.byteLength

					const percent = ( length === 0? countChunks: Math.round(100 * countBytes / length) )
					onprogress({ percent: Math.min(percent, 100), bytes: countBytes, chunks: countChunks })
				}
			}
		})
		await response.body.pipeThrough(transform, {signal}).pipeTo(writable, {signal})
	}
})()