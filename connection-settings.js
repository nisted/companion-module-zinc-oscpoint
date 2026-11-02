// Connection settings that can be changed from an action (Nige's module pattern):
// - each connection field has a "Can be set by the action" tickbox (allowSet_<id>)
// - only ticked fields appear in the "Connection: set settings" action
// - a value set by the action is written into the connection field (saveConfig)
// - unticking puts the field back to the value it had when the box was ticked
//
// Snapshots of the "value when ticked" live in the config under SNAP_KEY, with a copy in memory
// in case Companion drops keys that aren't on the settings page when someone edits the connection.

const SNAP_KEY = 'settingSnapshots'
const tickId = (id) => `allowSet_${id}`

const isIp = (v) => /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(v)
const intIn = (min, max) => (v) => /^\d+$/.test(v) && Number(v) >= min && Number(v) <= max

const SETTABLE = [
	{ id: 'remotehost', label: 'Remote IP', check: isIp, hint: 'an IPv4 address' },
	{ id: 'remoteport', label: 'Remote port', check: intIn(1, 65535), hint: '1-65535' },
	{ id: 'localport', label: 'Local port', check: intIn(1, 65535), hint: '1-65535' },
	{ id: 'heartbeatTimeout', label: 'Connection timeout (s)', check: intIn(0, 120), hint: '0-120', numeric: true },
	{ id: 'helperPort', label: 'OSCPoint Helper port', check: intIn(0, 65535), hint: '0-65535', numeric: true },
]

const tickboxField = (id) => ({
	type: 'checkbox',
	id: tickId(id),
	label: 'Can be set by the action',
	tooltip:
		'Tick to let the "Connection: set settings" action change this setting (e.g. from a variable or expression). Unticking puts it back to the value it had when you ticked it.',
	width: 4,
	default: false,
})

/**
 * Apply tick/untick rules to an incoming config.
 * Returns { config, dirty } - dirty = config was changed here and must be saved back.
 */
function reconcile(self, oldConfig, incoming) {
	const config = { ...incoming }
	const before = JSON.stringify(incoming[SNAP_KEY] ?? {}) + JSON.stringify(SETTABLE.map((f) => incoming[f.id]))
	const snaps = { ...(self.settingSnapshots ?? {}), ...(incoming[SNAP_KEY] ?? {}) }

	for (const f of SETTABLE) {
		const nowTicked = !!config[tickId(f.id)]
		// first load: no previous config, so treat the tickbox as unchanged
		const wasTicked = oldConfig ? !!oldConfig[tickId(f.id)] : nowTicked

		if (nowTicked && (!wasTicked || !(f.id in snaps))) {
			snaps[f.id] = config[f.id]
			self.log('debug', `${f.label}: can now be set by the action (will return to "${snaps[f.id]}" when unticked)`)
		} else if (!nowTicked && wasTicked) {
			if (f.id in snaps) {
				config[f.id] = snaps[f.id]
				self.log('info', `${f.label}: unticked - restored to "${snaps[f.id]}"`)
			}
			delete snaps[f.id]
		} else if (!nowTicked) {
			delete snaps[f.id]
		}
	}

	config[SNAP_KEY] = snaps
	self.settingSnapshots = snaps
	const after = JSON.stringify(snaps) + JSON.stringify(SETTABLE.map((f) => config[f.id]))
	return { config, dirty: before !== after }
}

/** Option fields for the action - only the ticked settings. */
function actionOptions(config) {
	const ticked = SETTABLE.filter((f) => config && config[tickId(f.id)])
	if (ticked.length === 0) {
		return [
			{
				type: 'static-text',
				id: 'none',
				label: 'No settings can be set yet',
				value:
					'Tick "Can be set by the action" next to a setting on this connection\'s settings page, then come back to this action.',
			},
		]
	}
	return ticked.map((f) => ({
		type: 'textinput',
		id: f.id,
		label: f.label,
		default: '',
		useVariables: true,
		tooltip: `Leave blank to keep the current value. Must be ${f.hint}. Use the expression toggle for variables or maths.`,
	}))
}

function setSettingsAction(self) {
	return {
		connectionSetSettings: {
			name: 'Connection: set settings',
			description:
				"Changes this connection's settings - only the ones ticked \"Can be set by the action\". Blank fields are left alone. The new value is saved into the connection settings.",
			options: actionOptions(self.config),
			callback: async (event) => {
				const next = { ...self.config }
				const changed = []
				for (const f of SETTABLE) {
					if (!(f.id in event.options)) continue
					const raw = String(event.options[f.id] ?? '').trim()
					if (raw === '') continue
					if (!self.config[tickId(f.id)]) {
						self.log('warn', `Set settings: "${f.label}" isn't ticked "Can be set by the action" - ignored`)
						continue
					}
					if (!f.check(raw)) {
						self.log('warn', `Set settings: "${raw}" isn't a valid ${f.label} (${f.hint}) - ignored`)
						continue
					}
					const value = f.numeric || typeof self.config[f.id] === 'number' ? Number(raw) : raw
					if (String(self.config[f.id]) === String(value)) continue
					next[f.id] = value
					changed.push(`${f.label} = ${value}`)
				}
				if (changed.length === 0) return
				self.log('info', `Set settings: ${changed.join(', ')}`)
				self.saveConfig(next)
				await self.applyConfig(next, true)
			},
		},
	}
}

module.exports = { SETTABLE, SNAP_KEY, tickId, tickboxField, reconcile, setSettingsAction }
