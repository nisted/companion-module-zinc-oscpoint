// Main/backup sync actions.
// Companion v2 modules can't read another connection's variables directly, so the source
// values come in through option fields that accept variables, e.g. $(Main:currentSlide).

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const toInt = (v) => {
	const n = parseInt(v)
	return isNaN(n) ? null : n
}

// UTF-8 safe string arg: OSCPoint takes ASCII strings or UTF-8 blobs
const textArg = (s) => {
	// eslint-disable-next-line no-control-regex
	if (/^[\x00-\x7F]*$/.test(s)) return { type: 's', value: s }
	return { type: 'b', value: Buffer.from(s, 'utf8') }
}

module.exports = function (self, sendOscMessage) {
	// Where we last told this PowerPoint to go. Own feedback lags behind our commands, so for a
	// short while we trust this rather than our (stale) variables - stops overshooting when the
	// source fires several builds in quick succession.
	self.syncExpected = null
	let busy = Promise.resolve()

	const currentPosition = () => {
		const slide = toInt(self.getVariableValue('currentSlide'))
		const build = toInt(self.getVariableValue('buildPosition')) ?? 0
		const exp = self.syncExpected
		if (exp && Date.now() - exp.time < 1500 && (slide !== exp.slide || build !== exp.build)) {
			return { slide: exp.slide, build: exp.build }
		}
		return { slide, build }
	}

	const step = async (path, count, delay) => {
		for (let i = 0; i < count; i++) {
			sendOscMessage(path, [])
			if (delay > 0) await sleep(delay)
		}
	}

	const doSync = async (opts) => {
		const tSlide = toInt(opts.sourceSlide)
		const tBuild = Math.max(0, toInt(opts.sourceBuild) ?? 0)
		const sourceState = String(opts.sourceState ?? '').trim()
		const ownState = String(self.getVariableValue('state') ?? '')
		const delay = toInt(opts.stepDelay) ?? 30

		// Source has left the slide show
		if (sourceState === 'edit') {
			if (opts.mirrorStartStop && ownState !== 'edit') {
				self.log('info', 'Sync: source ended slide show - ending here')
				sendOscMessage('/oscpoint/slideshow/end', [])
				self.syncExpected = null
			}
			return
		}

		if (tSlide === null || tSlide < 1) {
			self.log('debug', `Sync: no valid source slide ("${opts.sourceSlide}") - check the source connection label`)
			return
		}

		// Not running here
		if (ownState === 'edit' || ownState === '') {
			if (!opts.mirrorStartStop) {
				self.log('debug', 'Sync: slide show not running on this machine - ignored')
				return
			}
			self.log('info', `Sync: starting slide show at slide ${tSlide}, build ${tBuild}`)
			sendOscMessage('/oscpoint/slideshow/start', [{ type: 'i', value: tSlide }])
			await sleep(toInt(opts.startDelay) ?? 1000)
			await step('/oscpoint/next', tBuild, delay)
			self.syncExpected = { slide: tSlide, build: tBuild, time: Date.now() }
			return
		}

		// Mirror pause/resume
		if (opts.mirrorStartStop) {
			if (sourceState === 'paused' && ownState === 'running') sendOscMessage('/oscpoint/slideshow/pause', [])
			if (sourceState === 'running' && ownState === 'paused') sendOscMessage('/oscpoint/slideshow/resume', [])
		}

		const cur = currentPosition()
		if (cur.slide === tSlide) {
			const diff = tBuild - cur.build
			if (diff === 0) return
			self.log('debug', `Sync: slide ${tSlide}, build ${cur.build} -> ${tBuild}`)
			await step(diff > 0 ? '/oscpoint/next' : '/oscpoint/previous', Math.abs(diff), delay)
		} else {
			self.log('debug', `Sync: slide ${cur.slide} -> ${tSlide}, build ${tBuild}`)
			sendOscMessage('/oscpoint/goto/slide', [{ type: 'i', value: tSlide }])
			if (tBuild > 0) {
				if (delay > 0) await sleep(delay)
				await step('/oscpoint/next', tBuild, delay)
			}
		}
		self.syncExpected = { slide: tSlide, build: tBuild, time: Date.now() }
	}

	return {
		syncToSource: {
			name: 'Sync: follow another connection (slide + build)',
			description:
				'Moves this PowerPoint to match another OSCPoint connection. Run it from a trigger on the source variables changing, or a button. Replace "Main" with the label of the connection to follow.',
			options: [
				{
					type: 'textinput',
					label: 'Source slide',
					id: 'sourceSlide',
					default: '$(Main:currentSlide)',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Source build position',
					id: 'sourceBuild',
					default: '$(Main:buildPosition)',
					useVariables: true,
				},
				{
					type: 'textinput',
					label: 'Source show state (optional)',
					id: 'sourceState',
					default: '$(Main:state)',
					useVariables: true,
				},
				{
					type: 'checkbox',
					label: 'Also mirror start / end / pause of the slide show',
					id: 'mirrorStartStop',
					default: true,
				},
				{
					type: 'number',
					label: 'Delay between build steps (ms)',
					id: 'stepDelay',
					default: 30,
					min: 0,
					max: 1000,
				},
				{
					type: 'number',
					label: 'Wait after starting slide show (ms)',
					id: 'startDelay',
					default: 1000,
					min: 0,
					max: 10000,
				},
			],
			callback: async (event) => {
				// serialise so overlapping triggers don't interleave their step sequences
				busy = busy.then(() => doSync(event.options)).catch((e) => self.log('error', `Sync error: ${e}`))
				await busy
			},
		},

		openMatchingPresentation: {
			name: 'Open presentation matching another connection',
			description:
				'Opens the file with the same name from this machine\'s active folder (or switches to it if already open). Replace "Main" with the source connection label. File access must be enabled in OSCPoint on this machine.',
			options: [
				{
					type: 'textinput',
					label: 'Presentation name',
					id: 'fileName',
					default: '$(Main:presentationName)',
					useVariables: true,
				},
			],
			callback: async (event) => {
				let name = String(event.options.fileName ?? '').trim()
				if (!name || name === '(none)' || name.startsWith('$(')) {
					self.log('warn', `Open matching: no presentation name from source ("${name}")`)
					return
				}
				// If the source name has no extension, match against this machine's active folder list
				if (!/\.pptx?$/i.test(name)) {
					const match = (self.files || []).find(
						(f) => f.name.replace(/\.pptx?$/i, '').toLowerCase() === name.toLowerCase()
					)
					if (match) name = match.name
				}
				const inFolder = (self.files || []).some((f) => f.name === name)
				if (self.files && self.files.length && !inFolder) {
					self.log('warn', `Open matching: "${name}" not in active folder list here - trying anyway`)
				}
				self.log('info', `Opening ${name}`)
				sendOscMessage('/oscpoint/files/open', [textArg(name)])
			},
		},
	}
}
