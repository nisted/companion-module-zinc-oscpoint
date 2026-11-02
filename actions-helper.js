// Actions for the OSCPoint Helper (nisted/oscpoint-helper), a separate Windows tray app that
// runs on the PowerPoint machine alongside OSCPoint and listens on its own UDP port.

const textArg = (s) => {
	// eslint-disable-next-line no-control-regex
	if (/^[\x00-\x7F]*$/.test(s)) return { type: 's', value: s }
	return { type: 'b', value: Buffer.from(s, 'utf8') }
}

module.exports = function (self) {
	const helperPort = () => parseInt(self.config.helperPort ?? 35553)
	const helperEnabled = () => {
		const p = helperPort()
		return !isNaN(p) && p > 0
	}

	const send = (cmd, args = []) => {
		if (!helperEnabled()) {
			self.log('warn', `Helper action "${cmd}" ignored - helper port is off in the connection config`)
			return
		}
		self.oscSend(self.config.remotehost, helperPort(), `/oscpoint/helper/${cmd}`, args)
	}
	self.helperSend = send

	const showChoices = (self.customShows || []).map((n) => ({ id: n, label: n }))

	return {
		helperCustomShowStart: {
			name: 'Helper: start custom slide show',
			description: 'Starts a named custom slide show (Slide Show > Custom Slide Show in PowerPoint).',
			options: [
				{
					type: 'dropdown',
					label: 'Custom show',
					id: 'name',
					choices: showChoices,
					default: showChoices.length ? showChoices[0].id : '',
					allowCustom: true,
					tooltip: 'List comes from the open presentation. You can also type a name or use a variable.',
				},
				{
					type: 'checkbox',
					label: 'End any running slide show first',
					id: 'endRunning',
					default: true,
				},
			],
			callback: async (event) => {
				const name = String(event.options.name ?? '').trim()
				if (!name) return self.log('warn', 'Custom show: no name given')
				send('customshow/start', [textArg(name), { type: 'i', value: event.options.endRunning ? 1 : 0 }])
			},
		},
		helperCustomShowRefresh: {
			name: 'Helper: refresh custom show list',
			options: [],
			callback: async () => send('customshow/list'),
		},
		helperGotoBuild: {
			name: 'Helper: go to build (no flash-through)',
			description: 'Jumps straight to a build using PowerPoint GotoClick. Leave slide blank for the current slide.',
			options: [
				{ type: 'textinput', label: 'Slide (blank = current)', id: 'slide', default: '', useVariables: true },
				{ type: 'textinput', label: 'Build (0 = before first build)', id: 'build', default: '1', useVariables: true },
			],
			callback: async (event) => {
				const build = Math.max(0, parseInt(event.options.build) || 0)
				const slide = parseInt(event.options.slide)
				if (!isNaN(slide) && slide > 0) {
					send('goto/slidebuild', [
						{ type: 'i', value: slide },
						{ type: 'i', value: build },
					])
				} else {
					send('goto/build', [{ type: 'i', value: build }])
				}
			},
		},
		helperNotesScroll: {
			name: 'Helper: scroll Presenter View notes',
			description: 'For rotaries: put "Down" on rotate right and "Up" on rotate left.',
			options: [
				{
					type: 'dropdown',
					label: 'Direction',
					id: 'dir',
					choices: [
						{ id: 'down', label: 'Down (lines)' },
						{ id: 'up', label: 'Up (lines)' },
						{ id: 'pagedown', label: 'Page down' },
						{ id: 'pageup', label: 'Page up' },
						{ id: 'top', label: 'To top' },
						{ id: 'bottom', label: 'To bottom' },
					],
					default: 'down',
				},
				{ type: 'number', label: 'Lines', id: 'lines', default: 1, min: 1, max: 50 },
			],
			callback: async (event) => {
				const lines = { type: 'i', value: parseInt(event.options.lines) || 1 }
				switch (event.options.dir) {
					case 'down':
						return send('notes/scroll/down', [lines])
					case 'up':
						return send('notes/scroll/up', [lines])
					case 'pagedown':
						return send('notes/page/down')
					case 'pageup':
						return send('notes/page/up')
					case 'top':
						return send('notes/top')
					case 'bottom':
						return send('notes/bottom')
				}
			},
		},
		helperNotesFont: {
			name: 'Helper: Presenter View notes text size',
			options: [
				{
					type: 'dropdown',
					label: 'Size',
					id: 'dir',
					choices: [
						{ id: 'larger', label: 'Larger' },
						{ id: 'smaller', label: 'Smaller' },
					],
					default: 'larger',
				},
				{ type: 'number', label: 'Steps', id: 'times', default: 1, min: 1, max: 10 },
			],
			callback: async (event) =>
				send(`notes/font/${event.options.dir}`, [{ type: 'i', value: parseInt(event.options.times) || 1 }]),
		},
		helperOverlay: {
			name: 'Helper: VT remaining-time overlay',
			options: [
				{
					type: 'dropdown',
					label: 'Action',
					id: 'action',
					choices: [
						{ id: 'show', label: 'Enable' },
						{ id: 'hide', label: 'Hide' },
						{ id: 'toggle', label: 'Toggle' },
						{ id: 'larger', label: 'Bigger' },
						{ id: 'smaller', label: 'Smaller' },
						{ id: 'setup_on', label: 'Positioning mode on' },
						{ id: 'setup_off', label: 'Positioning mode off' },
					],
					default: 'toggle',
				},
			],
			callback: async (event) => {
				const a = event.options.action
				if (a === 'setup_on') return send('overlay/setup', [{ type: 'i', value: 1 }])
				if (a === 'setup_off') return send('overlay/setup', [{ type: 'i', value: 0 }])
				send(`overlay/${a}`)
			},
		},
	}
}
