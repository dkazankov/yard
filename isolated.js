'use strict';

const player = document.getElementById('player')
if (player) {
	(function () {
		const RPC = (function () {
			let id = 0
			const rpc = {
				callRemote: function (method, parameters) {
					id++
					const callback = method + id
					let result = null, error = null
					addEventListener(callback, handler)
					function handler(e) {
						console.log('ISOLATED received', e)
						removeEventListener(callback, handler)
						if (e.detail?.error) {
							error = e.detail.error
						} else {
							result = e.detail.result
						}
					}
					console.log('ISOLATED calls', method, parameters, callback)
					const detail = { callback, parameters }
					dispatchEvent(new CustomEvent(method, { detail }))

					if (error) {
						throw new Error(error.message, { cause: error.code })
					}
					return result
				},
				getCDNPlayerInfo: function () {
					return rpc.callRemote('getCDNPlayerInfo', {})
				}
			}
			return rpc
		})()

		// Observe changes in the video source to update the download links when a new video is loaded
		let srcChanged = true
		let srcPrev = player.getElementsByTagName('video')[0].src
		const observer = new MutationObserver(function (mutationList, observer) {
			try {
				const src = player.getElementsByTagName('video')[0].src
				if (srcPrev !== src) {
					// console.log('Video source changed', {srcPrev, src})
					srcPrev = src
					srcChanged = true
				}
			} catch (error) {
				console.error(error)
			}
		})
		// observer.observe(document.querySelector('body'), { childList: true, subtree: true })
		observer.observe(player, { childList: true, subtree: true })

		const downloaderId = 'MyDownloader'
		let downloader = document.getElementById(downloaderId)
		if (!downloader) {
			createDownloader().catch(error => {
				console.error('Error creating downloader', error)
			})
		}

		async function createDownloader() {
			const sendVideoIssue = document.getElementById('send-video-issue')
			const parentNode = sendVideoIssue.parentNode

			downloader = document.createElement('div')
			downloader.id = downloaderId
			parentNode.insertBefore(downloader, sendVideoIssue)

			// Create the download menu
			const menu_element = createDownloadMenu()
			downloader.appendChild(menu_element)

			// Create the download button
			const button_element = createDownloadButton()
			downloader.appendChild(button_element)

			const link_template = createElementFromHTMLString(
				`<a target="_blank" style="display: block;
					color: white; text-decoration: none; padding: 4px 5px; margin: 2px 0; border-radius: 6px; transition: 0.2s; cursor: pointer;">
					<span></span>
					<span style="float: right;">
						<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100" height="50px" style="margin:auto; display:block;" >
							<g transform="translate(25 50)">
								<circle cx="0" cy="0" r="6" fill="lightblue">
									<animateTransform attributeName="transform" type="scale" begin="-0.3333333333333333s" calcMode="spline" keySplines="0.3 0 0.7 1;0.3 0 0.7 1" values="0;1;0" keyTimes="0;0.5;1" dur="1s" repeatCount="indefinite"></animateTransform>
								</circle>
							</g>
							<g transform="translate(50 50)">
								<circle cx="0" cy="0" r="6" fill="lightblue">
									<animateTransform attributeName="transform" type="scale" begin="-0.16666666666666666s" calcMode="spline" keySplines="0.3 0 0.7 1;0.3 0 0.7 1" values="0;1;0" keyTimes="0;0.5;1" dur="1s" repeatCount="indefinite"></animateTransform>
								</circle>
							</g>
							<g transform="translate(75 50)">
								<circle cx="0" cy="0" r="6" fill="lightblue">
									<animateTransform attributeName="transform" type="scale" begin="0s" calcMode="spline" keySplines="0.3 0 0.7 1;0.3 0 0.7 1" values="0;1;0" keyTimes="0;0.5;1" dur="1s" repeatCount="indefinite"></animateTransform>
								</circle>
							</g>
						</svg>
					</span>
				</a>`
			)
			link_template.title = chrome.i18n.getMessage("download_link_description")

			const control_template = createElementFromHTMLString(
				`<span class="download-area" style="display: flex; align-items: center; padding: 6px 0;">
					<progress max="100"></progress>
					<span style="margin-left: 5px;">0%</span>
					<button style="margin-left: 5px; border-radius: 50px; border: 2px solid transparent; height: 20px; width: 20px; display: flex;
						align-items: center; justify-content: center; color: red; transition: 0.25s;">X</button>
				</span>`
			)
			control_template.lastElementChild.title = chrome.i18n.getMessage("cancel")

			const size_template = createElementFromHTMLString(`<span style="float: right;">?</span>`)

			// console.log('Downloader created')

			function createDownloadMenu() {
				const element = createElementFromHTMLString(
					`<div style="display: none; min-height: 50px; width: 350px; background: rgba(93, 93, 93, 0.5); backdrop-filter: blur(5px);
								position: absolute; border-radius: 6px; padding: 4px; filter: drop-shadow(black 2px 4px 6px); z-index: 100; right: 0; top: 55px; opacity: 0;
								transform: scale(0); transform-origin: top center; transition: 0.5s;">
						<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100" height="50px" style="margin:auto; display:block;" >
							<g transform="translate(25 50)">
								<circle cx="0" cy="0" r="6" fill="lightblue">
									<animateTransform attributeName="transform" type="scale" begin="-0.3333333333333333s" calcMode="spline" keySplines="0.3 0 0.7 1;0.3 0 0.7 1" values="0;1;0" keyTimes="0;0.5;1" dur="1s" repeatCount="indefinite"></animateTransform>
								</circle>
							</g>
							<g transform="translate(50 50)">
								<circle cx="0" cy="0" r="6" fill="lightblue">
									<animateTransform attributeName="transform" type="scale" begin="-0.16666666666666666s" calcMode="spline" keySplines="0.3 0 0.7 1;0.3 0 0.7 1" values="0;1;0" keyTimes="0;0.5;1" dur="1s" repeatCount="indefinite"></animateTransform>
								</circle>
							</g>
							<g transform="translate(75 50)">
								<circle cx="0" cy="0" r="6" fill="lightblue">
									<animateTransform attributeName="transform" type="scale" begin="0s" calcMode="spline" keySplines="0.3 0 0.7 1;0.3 0 0.7 1" values="0;1;0" keyTimes="0;0.5;1" dur="1s" repeatCount="indefinite"></animateTransform>
								</circle>
							</g>
						</svg>
						<div style="display:none;"></div>
						<details style="border: 1px solid white; border-radius: 8px; margin: 2px; margin-top: 8px; cursor: pointer; display:none;">
							<summary style="color: aqua; border-radius: 8px; text-align: center; transition: 0.2s;">
								<span></span>
								<span style="float: right;">0</span>
							</summary>
						</details>
					</div>`
				)
				const summary = element.querySelector('summary')
				summary.onmouseover = function () {
					summary.style.background = 'blueviolet'
				}
				summary.onmouseout = function () {
					summary.style.background = null
				}
				summary.firstElementChild.innerText = chrome.i18n.getMessage("subtitles")
				return element
			}

			function createDownloadButton() {
				const element = createElementFromHTMLString(
					`<div style="right: 55px; top: 0; height: 50px; width: 50px;
							position: absolute; cursor: pointer; transition: 0.3s; background: #32cd32; color: white;">
						<img style="height: 40px; width: 40px; padding: 5px; color: white;"></img>
					</div>`
				)
				element.title = chrome.i18n.getMessage("download")
				element.firstElementChild.src = chrome.runtime.getURL("/assets/download.svg")
				element.onmouseover = function () {
					element.style.background = '#013220'
				}
				element.onmouseout = function () {
					element.style.background = '#32cd32'
				}
				element.onclick = function () {
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

			function createDownloadLink(template, url, fileName, type, title) {
				const a = template.cloneNode(true)
				a.href = url
				a.download = fileName
				a.type = type
				a.firstElementChild.innerText = title
				a.onmouseover = function () {
					a.style.background = 'rgb(0, 0, 255, 0.75)'
				}
				a.onmouseout = function () {
					a.style.background = null
				}
				a.onclick = function (event) {
					event.preventDefault()
					if (a.type === undefined || a.type === '') {
						return
					}

					let extension = ''
					let types = []
					if (a.type === 'video/mp4') {
						extension = '.mp4'
						types.push({ description: 'MP4 video', accept: { 'video/mp4': ['.mp4'] } })
					} else if (a.type === 'text/vtt') {
						extension = '.vtt'
						types.push({ description: 'VTT subtitles', accept: { 'text/vtt': ['.vtt'] } })
					}

					const message = { method: 'download', url: a.href, filename: a.download + extension }
					chrome.runtime.sendMessage(message)
				}

				const element = size_template.cloneNode(true)
				if (url.host && (url.host.includes('stream.voidboost') || type === 'text/vtt')) {
					getRemoteFileSize(url)
					.then(function (size) {
						element.innerText = formatBytes(size, 1)
					})
					.catch(function (error) {
						console.error('Error getting size for '+url, error)
						element.innerText = formatBytes(0, 1)
					})
				}
				a.replaceChild(element, a.lastElementChild)
				return a
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

				removeOldLinks(list.firstElementChild)
				removeOldLinks(summary.nextElementSibling)

				const template = '%title-s%seasone%episode-%translation-%resolution'

				const info = getVideoInfo()

				for (const stream of info.streams) {
					const fileName = instantiateTemplate(template, {...info, title: info.originalTitle, resolution: stream.quality})
					let i = 0
					for (const link of stream.links) {
						const url = new URL(link.trim())
						if (url.pathname.includes(':hls:')) {
							continue
						}
						i++
						const a = createDownloadLink(link_template, url, fileName, 'video/mp4', stream.quality + " #" + i + " @" + url.hostname)
						list.appendChild(a)
					}
				}
				if ( info.streams.length === 0 ) {
					const a = createDownloadLink(link_template, '#', '', '', 'Incorrect streams')
					list.appendChild(a)
				}

				for (const subtitle of info.subtitles) {
					const fileName = instantiateTemplate(template, {...info, title: info.originalTitle, translation: subtitle.lang, resolution: null})
					const url = new URL(subtitle.link.trim())
					const a = createDownloadLink(link_template, url, fileName, 'text/vtt', subtitle.lang)
					details.appendChild(a)
				}
				if ( info.subtitles.length > 0 ) {
					summary.lastElementChild.innerText = ''+info.subtitles.length
				}

				svg.style.display = (list.childElementCount > 1 || details.childElementCount > 1 ? 'none': 'block')
				list.style.display = (list.childElementCount > 1 ? 'block': 'none')
				details.style.display = (details.childElementCount > 1 ? 'block': 'none')
			}

			return downloader
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

			info.streams = []
			info.subtitles = []

			console.log('RPC object', RPC)
			const CDNPlayerInfo = RPC.getCDNPlayerInfo()

			// console.log('CDNPlayerInfo', CDNPlayerInfo)

			if ( CDNPlayerInfo?.quality ) {
				info.quality = CDNPlayerInfo.quality
			}
			if ( CDNPlayerInfo?.subtitle_def ) {
				info.subtitle_def = CDNPlayerInfo.subtitle_def
			}
			if ( CDNPlayerInfo?.subtitle_lns ) {
				info.subtitle_lns = CDNPlayerInfo.subtitle_lns
			}
			if ( CDNPlayerInfo?.streams ) {
				const streams = CDNPlayerInfo.streams.split(',')
				for (const stream of streams) {
					const temp = stream.split('[')[1].split(']')
					const quality = temp[0]
					const links = temp[1].split(' or ')
					info.streams.push({quality, links})
				}
			}
			if ( CDNPlayerInfo?.subtitle ) {
				const subtitles = CDNPlayerInfo.subtitle.split(',')
				for (const subtitle of subtitles) {
					const temp = subtitle.split('[')[1].split(']')
					const lang = temp[0]
					const link = temp[1]
					info.subtitles.push({lang, link})
				}
			}

			// console.log('Video info', info)
			return info
		}

		function createElementFromHTMLString(html) {
			const element = document.createElement('div')
			element.innerHTML = html
			return element.firstElementChild
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

		console.log('ISOLATED script loaded')
	})()
}
