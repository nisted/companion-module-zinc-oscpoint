const osc = require('osc')
const { InstanceStatus } = require('@companion-module/base')
const textHelper = require('./text-helper')

// Connection health:
// UDP has no handshake, so binding the local port says nothing about whether OSCPoint is there.
// Status only goes OK once a real /oscpoint/ message arrives. If the line goes quiet, we send
// /oscpoint/feedbacks/refresh as a probe; no reply within the timeout => ConnectionFailure.
const PROBE_AFTER_SILENCE_MS = 5000

const oscListener = {
	lastSeen: 0,
	online: false,
	heartbeatTimer: null,
	close: async function () {
		this.stopHeartbeat()
		await this.udpPort.close()
	},
	markSeen: function (self) {
		this.lastSeen = Date.now()
		if (!this.online) {
			this.online = true
			self.log('info', 'OSCPoint is responding')
			self.updateStatus(InstanceStatus.Ok, 'Connected.')
		}
	},
	startHeartbeat: function (self) {
		this.stopHeartbeat()
		// existing connections won't have this field yet -> default 10s
		const timeoutS = parseInt(self.config.heartbeatTimeout ?? 10)
		if (isNaN(timeoutS) || timeoutS <= 0) {
			// heartbeat disabled: old behaviour (OK as soon as local port is open)
			this.online = true
			self.updateStatus(InstanceStatus.Ok, 'Listening (heartbeat disabled)')
			return
		}
		this.heartbeatTimer = setInterval(() => {
			const silence = Date.now() - this.lastSeen
			if (silence > timeoutS * 1000) {
				if (this.online || this.lastSeen === 0) {
					self.log('warn', `No reply from OSCPoint at ${self.config.remotehost}:${self.config.remoteport}`)
				}
				this.online = false
				this.lastSeen = this.lastSeen || Date.now() // avoid log spam before first contact
				self.updateStatus(
					InstanceStatus.ConnectionFailure,
					`No response from OSCPoint at ${self.config.remotehost}:${self.config.remoteport}`
				)
			}
			if (silence > PROBE_AFTER_SILENCE_MS) {
				self.oscSend(self.config.remotehost, self.config.remoteport, `/oscpoint/feedbacks/refresh`, [])
			}
		}, 2500)
	},
	stopHeartbeat: function () {
		if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
		this.heartbeatTimer = null
		if (this.helperTimer) clearInterval(this.helperTimer)
		this.helperTimer = null
	},

	// ---- OSCPoint Helper (separate app, own port, replies to our local port) ----
	helperLastSeen: 0,
	helperTimer: null,
	startHelperPing: function (self) {
		if (this.helperTimer) clearInterval(this.helperTimer)
		this.helperTimer = null
		self.helperOnline = false
		const port = parseInt(self.config.helperPort ?? 35553)
		if (isNaN(port) || port <= 0) {
			self.setVariableValues({ helperStatus: 'not used' })
			return
		}
		const ping = () => {
			self.oscSend(self.config.remotehost, port, '/oscpoint/helper/ping', [])
			if (self.helperOnline && Date.now() - this.helperLastSeen > 12000) {
				self.helperOnline = false
				self.log('warn', 'OSCPoint Helper stopped responding')
				self.setVariableValues({ helperStatus: 'offline' })
				self.checkFeedbacks('helperOnline')
			}
		}
		ping()
		this.helperTimer = setInterval(ping, 5000)
	},
	processHelper: function (oscMsg, self) {
		this.helperLastSeen = Date.now()
		if (!self.helperOnline) {
			self.helperOnline = true
			self.log('info', 'OSCPoint Helper is responding')
			self.checkFeedbacks('helperOnline')
		}
		const what = oscMsg.address.substring('/oscpoint/helper/'.length)
		const arg0 = oscMsg.args && oscMsg.args.length ? textHelper.extractText(oscMsg.args, self) : ''
		switch (what) {
			case 'pong':
				self.setVariableValues({ helperVersion: arg0 })
				break
			case 'status':
				self.setVariableValues({ helperStatus: arg0 })
				break
			case 'customshows': {
				let list = []
				try {
					list = JSON.parse(arg0)
				} catch (e) {
					return self.log('error', `Helper: bad custom show list: ${e}`)
				}
				self.customShows = Array.isArray(list) ? list : []
				self.setVariableValues({
					customShows: JSON.stringify(self.customShows),
					customShowCount: self.customShows.length,
				})
				self.updateActions() // refresh the custom show dropdown
				break
			}
			default:
				self.log('debug', `Helper: unhandled ${oscMsg.address}`)
		}
	},
	mediaDuration: 0,
	mediaPosition: 0,
	mediaRemaining: 0,
	connect: async function (self) {
		this.udpPort = new osc.UDPPort({
			localAddress: '0.0.0.0',
			localPort: self.config.localport,
			metadata: true,
		})

		this.udpPort.open()

		this.udpPort.on('ready', () => {
			self.log('info', `Listening for OSCPoint messages on port ${self.config.localport}`)
			this.online = false
			this.lastSeen = 0
			self.updateStatus(InstanceStatus.Connecting, 'Waiting for OSCPoint to reply...')

			//send a refresh request to OSCPoint
			self.log('info', `Requesting feedback update using OSC /oscpoint/feedbacks/refresh`)
			self.oscSend(self.config.remotehost, self.config.remoteport, `/oscpoint/feedbacks/refresh`, [])
			this.startHeartbeat(self)
			this.startHelperPing(self)
		})

		this.udpPort.on('message', (oscMsg) => {
			if (typeof oscMsg.address === 'string' && oscMsg.address.startsWith('/oscpoint/helper/')) {
				return this.processHelper(oscMsg, self)
			}
			if (typeof oscMsg.address === 'string' && oscMsg.address.startsWith('/oscpoint/')) {
				this.markSeen(self)
			}
			if (!oscMsg.args || oscMsg.args.length === 0) return
			this.processData(oscMsg, self)
		})

		this.udpPort.on('error', (err) => {
			if (err.code === 'EADDRINUSE') {
				self.log('error', 'Error: Selected port in use.' + err.message)
				self.updateStatus(InstanceStatus.ConnectionFailure, `Port ${self.config.localport} in use elsewhere.`)
			} else {
				self.log('error', 'UDP port error: ' + err.message)
				self.updateStatus(InstanceStatus.UnknownError, err.message)
			}
		})
	},

	processData: function (oscMsg, self) {
		//truncate the message arg if it's too long
		let argLog = oscMsg.args[0].value
		if (typeof oscMsg.args[0].value === 'string' && oscMsg.args[0].value.length > 50) {
			argLog = oscMsg.args[0].value.substring(0, 50) + '...'
		}
		if (oscMsg.address == '/oscpoint/slideshow/notes-utf-8') {
			const n = Buffer.from(oscMsg.args[0].value).toString('utf8')
			if (n.length > 50) {
				argLog = `"${n.substring(0, 50)}..."`
			} else {
				argLog = `"${n}"`
			}
		}

		self.log('info', `OSC message received: ${oscMsg.address} ${argLog}`)
		const msgParts = oscMsg.address.split('/')
		if (msgParts[1] != 'oscpoint') return
		const feedbackId = oscMsg.address.substring(9)

		switch (feedbackId) {
			case `/v2/presentations`: {
				let presentationsJson = textHelper.extractText(oscMsg.args, self)
				self.setVariableValues({ presentations: presentationsJson })
				try {
					self.presentations = JSON.parse(presentationsJson)
				} catch (e) {
					self.presentationsCount = 0
					self.presentationsIndex = 0
					self.presentations = []
					return self.log('error', `Error parsing presentations JSON: ${e}`)
				}

				self.presentationsCount = self.presentations.length
				if (self.presentationsCount == 0) {
					return self.setVariableValues({
						presentationsSelectedFilename: '',
						presentationsFileNames: JSON.stringify([]),
						presentationsSelectedIndex: 1,
					})
				}

				let names = []
				for (let i = 0; i < self.presentationsCount; i++) {
					names.push(self.presentations[i].name)
				}

				//pin index to within the bounds of the array
				self.presentationsIndex = Math.min(self.presentationsIndex, self.presentationsCount - 1)
				self.presentationsIndex = Math.max(self.presentationsIndex, 0)

				self.log('debug', `Getting presentation index ${self.presentationsIndex}`)
				self.setVariableValues({
					presentationsSelectedFilename: self.presentations[self.presentationsIndex].name,
					presentationsFileNames: JSON.stringify(names),
					presentationsCount: self.presentationsCount,
				})
				break
			}
			case `/v2/presentation`: {
				let presentationJson = textHelper.extractText(oscMsg.args, self)
				try {
					self.presentation = JSON.parse(presentationJson)
				} catch (e) {
					self.presentation = { sections: [] }
					return self.log('error', `Error parsing presentation JSON: ${e}`)
				}

				//make sure there's always a sections array
				if (!self.presentation.sections) {
					self.presentation.sections = []
				}
				this.setSectionVariables(self)
				self.setVariableValues({ presentation: presentationJson })
				break
			}
			case `/v2/files`: {
				let filesJson = textHelper.extractText(oscMsg.args, self)
				self.setVariableValues({ files: filesJson })
				try {
					self.files = JSON.parse(filesJson)
				} catch (e) {
					self.fileCount = 0
					self.fileIndex = 0
					return self.log('error', `Error parsing files JSON: ${e}`)
				}
				self.fileCount = self.files.length

				if (self.fileCount == 0) {
					return self.setVariableValues({
						activeFolderFileName: '(no files in folder)',
						activeFolderSelectedIndex: 0,
						activeFolderFileCount: 0,
						activeFolderFileNames: JSON.stringify([]),
					})
				}

				let names = []
				for (let i = 0; i < self.fileCount; i++) {
					names.push(self.files[i].name)
				}

				//pin index to within the bounds of the array
				self.fileIndex = Math.min(self.fileIndex, self.fileCount - 1)
				self.fileIndex = Math.max(self.fileIndex, 0)

				self.log('debug', `Getting file index ${self.fileIndex}`)
				self.setVariableValues({
					activeFolderFileName: self.files[self.fileIndex].name,
					activeFolderSelectedIndex: self.fileIndex + 1,
					activeFolderFileCount: self.fileCount,
					activeFolderFileNames: JSON.stringify(names),
				})
				break
			}
			case `/v2/files/enabled`: {
				self.setVariableValues({ fileAccessEnabled: oscMsg.args[0].value })
				self.checkFeedbacks('fileAccess')
				break
			}
			case `/v2/files/activefolder`: {
				self.setVariableValues({ activeFolder: textHelper.extractText(oscMsg.args, self) })
				break
			}
			case `/v2/files/activefolder/fullpath`: {
				self.setVariableValues({ activeFolderFullPath: textHelper.extractText(oscMsg.args, self) })
				break
			}
			case `/presentation/name`: {
				//let fileName = oscMsg.args[0].value == '' ? '(none)' : oscMsg.args[0].value

				self.setVariableValues({ presentationName: textHelper.extractText(oscMsg.args, self) })
				break
			}
			case `/presentation/slides/count`:
				self.setVariableValues({ slideCount: oscMsg.args[0].value })
				break
			case `/presentation/slides/count/visible`:
				self.setVariableValues({ slideCountVisible: oscMsg.args[0].value })
				break
			case `/slideshow/state`:
				self.setVariableValues({ state: oscMsg.args[0].value })
				self.checkFeedbacks('showState')
				break
			case `/slideshow/currentslide`:
				self.setVariableValues({ currentSlide: oscMsg.args[0].value })
				break
			case `/slideshow/slidesremaining`:
				self.setVariableValues({ slidesRemaining: oscMsg.args[0].value })
				break
			case `/slideshow/builds/position`:
				self.setVariableValues({ buildPosition: oscMsg.args[0].value })
				self.checkFeedbacks('slideProgressBars')
				break
			case `/slideshow/builds/count`:
				self.setVariableValues({ buildCount: oscMsg.args[0].value })
				break
			case `/slideshow/builds/remaining`:
				self.setVariableValues({ buildsRemaining: oscMsg.args[0].value })
				break
			case `/slideshow/section/index`:
				{
					let i = parseInt(oscMsg.args[0].value)
					//if nan, set to 0
					if (isNaN(i)) i = 0
					self.sectionIndex = i
					this.setSectionVariables(self)
				}
				break
			case `/slideshow/section/name`: {
				self.setVariableValues({ sectionName: textHelper.extractText(oscMsg.args, self) })
				break
			}
			case `/slideshow/section/slidesremaining`: {
				self.setVariableValues({ sectionSlidesRemaining: oscMsg.args[0].value })
				break
			}
			// case `/slideshow/notes`: {
			// 	let ns = oscMsg.args[0].value == '' ? '(none)' : `${oscMsg.args[0].value.substr(0, 20)}`
			// 	ns += oscMsg.args[0].value.length > 20 ? '...' : ''
			// 	let notes = oscMsg.args[0].value == '' ? '(none)' : oscMsg.args[0].value
			// 	self.setVariableValues({
			// 		notes: notes,
			// 		notesSnip: ns,
			// 	})
			// 	break
			// }
			case `/slideshow/notes-utf-8`: {
				//decode oscMsg.args[0] as UTF8
				let n = Buffer.from(oscMsg.args[0].value).toString('utf8')
				let ns = n == '' ? '(none)' : `${n.substr(0, 20)}`
				ns += n.length > 20 ? '...' : ''
				let notes = n == '' ? '(none)' : n
				self.setVariableValues({
					notes: notes,
					notesSnip: ns,
				})
				break
			}
			case `/slideshow/media/state`:
				self.setVariableValues({ mediaState: oscMsg.args[0].value })
				self.checkFeedbacks('mediaState')
				break

			//these three always come together, and mainly in this order, so we can risk batching the variable updates.
			case `/slideshow/media/duration`:
				this.mediaDuration = oscMsg.args[0].value
				break
			case `/slideshow/media/durationtrimmed`:
				this.mediaDurationTrimmed = oscMsg.args[0].value
				break
			case `/slideshow/media/position`:
				this.mediaPosition = oscMsg.args[0].value
				self.checkFeedbacks('mediaProgressBar')
				break
			case `/slideshow/media/remaining`:
				this.mediaRemaining = oscMsg.args[0].value
				self.setVariableValues({
					mediaDuration: Math.floor(this.mediaDuration / 1000),
					mediaDurationFormatted: this.convertToMmSs(this.mediaDuration),
					mediaDurationTrimmed: Math.floor(this.mediaDurationTrimmed / 1000),
					mediaDurationTrimmedFormatted: this.convertToMmSs(this.mediaDurationTrimmed),
					mediaPosition: Math.floor(this.mediaPosition / 1000),
					mediaPositionFormatted: this.convertToMmSs(this.mediaPosition),
					mediaRemaining: Math.floor(this.mediaRemaining / 1000),
					mediaRemainingFormatted: this.convertToMmSs(this.mediaRemaining),
				})
				break
			case `/slideshow/media/startpoint`:
				this.mediaStartPoint = oscMsg.args[0].value
				self.setVariableValues({
					mediaStartPoint: Math.floor(oscMsg.args[0].value),
				})
				break
			case `/slideshow/media/endpoint`:
				this.mediaEndPoint = oscMsg.args[0].value
				self.setVariableValues({
					mediaEndPoint: Math.floor(oscMsg.args[0].value),
				})
				break
			case `/slide/current/preview`:
				self.setVariableValues({ slidePreview: oscMsg.args[0].value })
				self.checkFeedbacks('slidePreview')
				break
			default:
				self.log('debug', `No action found for OSC ${oscMsg.address}`)
				break
		}
	},
	convertToMmSs(msValue) {
		let seconds = Math.floor(msValue / 1000)
		let mm = Math.floor(seconds / 60)
			.toString()
			.padStart(2, '0')
		let ss = Math.floor(seconds % 60)
			.toString()
			.padStart(2, '0')
		return `${mm}:${ss}`
	},
	setSectionVariables(self) {
		self.log('debug', `Setting section variables for section ${self.sectionIndex}`)
		//self.log('debug', JSON.stringify(self.presentation))

		//self.sectionIndex is 1-based
		if (self.sectionIndex < 1) {
			self.log('debug', `Section index is 0, setting defaults`)
			return this.setDefaultSectionVariables(self)
		}

		if (!self.presentation || self.presentation == '{}') {
			self.log('debug', `No presentation data, setting defaults`)
			return this.setDefaultSectionVariables(self)
		}

		if (self.presentation.sections.length < self.sectionIndex) {
			self.log('debug', `Section index out of range, setting defaults`)
			return this.setDefaultSectionVariables(self)
		}

		let section = self.presentation.sections[self.sectionIndex - 1]
		self.log(
			'debug',
			`Section ${self.sectionIndex} (${section.name}):  ${section.slideCount} slides, starting at slide ${section.firstSlide}`
		)

		const previousSection = self.sectionIndex == 1 ? {} : self.presentation.sections[self.sectionIndex - 2]
		const previousSectionName = previousSection.name ? previousSection.name : 'Start of deck'
		const previousSectionFirstSlide = previousSection.firstSlide ? previousSection.firstSlide : 1

		const nextSection =
			self.sectionIndex == self.presentation.sections.length ? {} : self.presentation.sections[self.sectionIndex]
		const nextSectionName = nextSection.name ? nextSection.name : 'End of deck'
		const nextSectionFirstSlide = nextSection.firstSlide ? nextSection.firstSlide : self.presentation.slideCount

		self.log('debug', `Previous section: ${previousSection.name}, next section: ${nextSection.name}`)

		self.setVariableValues({
			sectionName: section.name,
			sectionSlideCount: section.slideCount,
			sectionFirstSlide: section.firstSlide,
			sectionIndex: self.sectionIndex,
			previousSectionName: previousSectionName,
			previousSectionFirstSlide: previousSectionFirstSlide,
			nextSectionName: nextSectionName,
			nextSectionFirstSlide: nextSectionFirstSlide,
		})
	},
	setDefaultSectionVariables(self) {
		return self.setVariableValues({
			sectionName: '(none)',
			sectionSlideCount: 0,
			sectionFirstSlide: 0,
			sectionIndex: 0,
			previousSectionName: 'Start of deck',
			previousSectionFirstSlide: 0,
			nextSectionName: 'End of deck',
			nextSectionFirstSlide: 0,
		})
	},
}

module.exports = oscListener
