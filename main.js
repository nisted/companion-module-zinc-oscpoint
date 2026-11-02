const { InstanceBase, InstanceStatus } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')
const UpdateActions = require('./actions')
const UpdateFeedbacks = require('./feedbacks')
const UpdateVariableDefinitions = require('./variables')
const UpdatePresetDefinitions = require('./presets')
const oscListener = require('./osc-listener')
const configFields = require('./config')
const variableDefaults = require('./variable-defaults')
const connectionSettings = require('./connection-settings')

module.exports = class ModuleInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
	}

	async init(config) {
		const r = connectionSettings.reconcile(this, undefined, config)
		this.config = r.config
		if (r.dirty) this.saveConfig(this.config)
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
		const r = connectionSettings.reconcile(this, this.config, config)
		if (r.dirty) this.saveConfig(r.config) // unticked field restored / snapshot kept
		await this.applyConfig(r.config, false)
	}

	// Used by configUpdated and by the "Connection: set settings" action
	async applyConfig(config, fromAction) {
		const old = this.config || {}
		this.config = config
		this.updateActions() // the set-settings action only shows ticked settings

		const keys = ['remotehost', 'remoteport', 'localport', 'heartbeatTimeout', 'helperPort']
		if (keys.every((k) => String(old[k]) === String(config[k]))) return // nothing that needs a reconnect

		this.log('info', `${fromAction ? 'Settings set by action' : 'Config has changed'}, reconnecting...`)
		this.log('info', `Now sending OSC actions to ${this.config.remotehost}:${this.config.remoteport}`)
		this.updateStatus(InstanceStatus.Connecting, 'Reconnecting...')

		await oscListener.close()
		oscListener.connect(this)
	}

	// Return config fields for web config
	getConfigFields() {
		return configFields
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
