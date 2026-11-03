const { Regex } = require('@companion-module/base')
const { lockable } = require('./connection-settings')

const fieldsFor = (config) => [
	{
		id: 'important-line',
		type: 'static-text',
		label: 'OSCPoint lets you drive and keep an eye on PowerPoint on Windows, all over OSC.',
		value: `First things first: each PowerPoint machine needs the free OSCPoint add-in installed. Grab it here: <a href='https://oscpoint.com/donate' target="_blank">https://oscpoint.com/</a>`,
		width: 12,
	},
	{
		id: 'set-by-action-line',
		type: 'static-text',
		label: 'Setting these from variables',
		value: `Tick <b>Can be set by the action</b> next to a setting to let the <b>Connection: set settings</b> action change it (with variables or expressions, from a button or trigger). Unticking puts the setting back to what it was when you ticked it.<br/><br/>`,
		width: 12,
	},

	...lockable(config, {
		type: 'textinput',
		id: 'remotehost',
		label: 'Remote IP',
		tooltip: 'IP address of the PowerPoint machine running OSCPoint (and the OSCPoint Helper, if used).',
		width: 8,
		regex: Regex.IP,
		default: '127.0.0.1',
	}),
	...lockable(config, {
		type: 'textinput',
		id: 'remoteport',
		label: 'Remote port (default 35551)',
		tooltip: "OSCPoint's listening port on the PowerPoint machine. Set in PowerPoint on the OSCPoint ribbon tab. Default 35551.",
		width: 8,
		regex: Regex.PORT,
		default: 35551,
	}),
	{
		id: 'important-line-2',
		type: 'static-text',
		label: 'Where the PowerPoint machine lives on the network. Its IP address and port, basically.',
		value: `The remote port is <b>35551</b> out of the box. Want a different one? Change it on the OSCPoint ribbon tab in PowerPoint.<br/><br/>`,
		width: 12,
	},
	...lockable(config, {
		type: 'textinput',
		id: 'localport',
		label: 'Local port (default 35550)',
		tooltip:
			'Port this connection listens on for feedback from OSCPoint and the Helper. Must match the feedback port on the OSCPoint ribbon tab. Each OSCPoint connection needs its own. Default 35550.',
		width: 8,
		regex: Regex.PORT,
		default: 35550,
	}),
	{
		id: 'important-line-3',
		type: 'static-text',
		label: 'The port I listen on for OSC feedback coming back from OSCPoint.',
		value: `The local port is <b>35550</b> out of the box. You can change it on the OSCPoint ribbon tab in PowerPoint too.<br/><br/>`,
		width: 12,
	},
	...lockable(config, {
		type: 'number',
		id: 'heartbeatTimeout',
		label: 'Connection timeout, seconds (0 = off, default 10)',
		tooltip:
			'Status only shows OK once OSCPoint actually replies. If nothing is heard for this long, the connection shows as failed. Needs OSC feedbacks enabled in OSCPoint. 0 = old behaviour (OK as soon as the local port opens).',
		width: 8,
		min: 0,
		max: 120,
		default: 10,
	}),
	{
		id: 'heartbeat-line',
		type: 'static-text',
		label: 'Connection check',
		value: `No fibbing here: status only goes OK once OSCPoint actually replies. If I hear nothing for this long, the connection shows as failed. You'll need OSC feedbacks switched on in OSCPoint for this to work.<br/><br/>`,
		width: 12,
	},
	...lockable(config, {
		type: 'number',
		id: 'helperPort',
		label: 'OSCPoint Helper port (0 = not used, default 35553)',
		tooltip:
			'Port of the OSCPoint Helper app on the PowerPoint machine (custom shows, go-to-build, notes scroll/size, VT timer). It replies on the local port above. 0 = not used.',
		width: 8,
		min: 0,
		max: 65535,
		default: 35553,
	}),
	{
		id: 'helper-line',
		type: 'static-text',
		label: 'OSCPoint Helper',
		value: `An optional extra: a little Windows app that sits on the PowerPoint machine (same IP as above). It adds custom shows, go-to-build, notes scroll/size and the VT timer overlay. Its feedback comes back on the local port above.<br/><br/>`,
		width: 12,
	},
	{
		id: 'important-line-4',
		type: 'static-text',
		label: 'Running more than one PowerPoint machine?',
		value: `Main and backup, say? Each machine needs its own instance of OSCPoint, and you'll need to tweak the local port above so you get feedback from both.<br/>
		The <a href='https://github.com/phuvf/oscpoint/blob/main/CONFIGURATION.md'>configuration examples page on GitHub</a> has the full details and some example setups.`,
		width: 12,
	},
	{
		id: 'crew',
		type: 'static-text',
		label: "Psst. This one's got mates. 🍹",
		value: `This tweaked OSCPoint module is part of a little crew of Companion modules: some brand new, some old favourites given a good tweak. Want to know who else is in the crew, or grab the freshest version of each one? It's all here: <a href="https://github.com/nisted/companion-modules" target="_blank">github.com/nisted/companion-modules</a>`,
		width: 12,
	},
]

module.exports = fieldsFor
