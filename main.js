const { InstanceBase, InstanceStatus } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')
const UpdateActions = require('./actions')
const UpdateFeedbacks = require('./feedbacks')
const UpdateVariableDefinitions = require('./variables')
const UpdatePresetDefinitions = require('./presets')
const oscListener = require('./osc-listener')
const { fieldsFor, CONN_FIELDS, CONN_LABELS, NUMBER_FIELDS, NUMBER_RANGES, NUMBER_TYPE_FIELDS, isTicked } = require('./config')
const variableDefaults = require('./variable-defaults')

module.exports = class ModuleInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
	}

	async init(config) {
		this.config = config
		this.files = []
		this.fileIndex = 0
		this.fileCount = 0
		this.presentations = []
		this.presentation = { sections: [] }
		this.presentationsIndex = 0
		this.presentationsCount = 0
		this.sectionIndex = 0
		this.customShows = []
		this.helperOnline = false
		this.log('info', `OSCPoint module started`)
		this.log('info', `Sending OSC actions to ${this.config.remotehost}:${this.config.remoteport}`)
		this.updateStatus(InstanceStatus.Connecting, `Connecting to port ${this.config.localport}...`)

		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
		this.updatePresetDefinitions() // export preset definitions
		oscListener.connect(this)

		//set some defaults for the variables
		this.setVariableValues(variableDefaults)
	}

	// When module gets deleted
	async destroy() {
		await oscListener.close()
	}

	async configUpdated(config) {
		const old = this.config ?? {}
		// the saved hand-typed values are the module's own: keep the running copy
		const next = { ...config, actionSaved: old.actionSaved }
		const saved = this.savedValues()
		let ticksChanged = false
		for (const f of CONN_FIELDS) {
			const was = isTicked(old, f)
			const now = isTicked(next, f)
			if (!was && now) {
				// handed over to the action: remember what was typed, to put back when it's unticked
				saved[f] = next[f] ?? ''
				ticksChanged = true
			} else if (was && now) {
				// locked: only the action changes it, so a stale value from the connection page doesn't win
				next[f] = old[f]
			} else if (was && !now) {
				if (f in saved) next[f] = saved[f]
				delete saved[f]
				ticksChanged = true
			}
		}
		if (Object.keys(saved).length || old.actionSaved) next.actionSaved = JSON.stringify(saved)
		else delete next.actionSaved
		this.config = next
		if (ticksChanged) this.updateActions()
		this.log('info', 'Config has changed, updating...')
		await this.applyConnection()
		const keys = new Set([...Object.keys(config), ...Object.keys(next)])
		if ([...keys].some((k) => JSON.stringify(config[k]) !== JSON.stringify(next[k]))) this.saveConfig(this.config)
	}

	/** Reconnect with the current settings */
	async applyConnection() {
		this.log('info', `Now sending OSC actions to ${this.config.remotehost}:${this.config.remoteport}`)
		this.updateStatus(InstanceStatus.Connecting, 'Reconnecting...')

		await oscListener.close()
		oscListener.connect(this)
	}

	/** The hand-typed values put aside while a field is set by the action (field id -> value) */
	savedValues() {
		try {
			const v = JSON.parse(String(this.config?.actionSaved ?? '') || '{}')
			if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
			const out = {}
			for (const f of CONN_FIELDS) if (v[f] !== undefined) out[f] = v[f]
			return out
		} catch {
			return {}
		}
	}

	/** Run 'Connection: set settings': write the given values into the ticked fields, then apply them */
	async setConnectionByAction(options) {
		const ticked = CONN_FIELDS.filter((f) => isTicked(this.config, f))
		if (!ticked.length) {
			this.log(
				'info',
				'Connection: set settings: nothing\'s ticked "Can be set by the action" on the connection page yet, so there\'s nothing for me to set.',
			)
			return
		}
		const next = { ...this.config }
		let changed = false
		for (const f of CONN_FIELDS) {
			const v = String(options?.[f] ?? '').trim()
			if (v === '') continue
			if (!ticked.includes(f)) {
				this.log(
					'info',
					`Connection: set settings: "${CONN_LABELS[f]}" isn't ticked "Can be set by the action" on the connection page, so I've left it alone.`,
				)
				continue
			}
			if (NUMBER_FIELDS.has(f)) {
				const n = Number(v)
				const [lo, hi] = NUMBER_RANGES[f]
				if (!Number.isInteger(n) || n < lo || n > hi) {
					this.log(
						'warn',
						`Connection: set settings: "${CONN_LABELS[f]}" needs a whole number from ${lo} to ${hi}, and "${v}" isn't one. Left it as it was.`,
					)
					continue
				}
			}
			// number boxes on the connection page hold numbers; the rest are text
			const value = NUMBER_TYPE_FIELDS.has(f) ? Number(v) : v
			if (String(next[f] ?? '') !== String(value)) {
				next[f] = value
				changed = true
			}
		}
		if (!changed) return
		this.config = next
		this.saveConfig(this.config)
		await this.applyConnection()
	}

	// Return config fields for web config
	getConfigFields() {
		return fieldsFor(this.config)
	}

	updateActions() {
		UpdateActions(this)
	}
	updateFeedbacks() {
		UpdateFeedbacks(this)
	}
	updateVariableDefinitions() {
		UpdateVariableDefinitions(this)
	}
	updatePresetDefinitions() {
		UpdatePresetDefinitions(this)
	}
}

module.exports.UpgradeScripts = null
