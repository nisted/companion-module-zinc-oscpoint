const { Regex } = require('@companion-module/base')

const configFields = [
	{
		id: 'important-line',
		type: 'static-text',
		label: 'OSCPoint provides an OSC API to control and monitor PowerPoint on Windows devices.',
		value: `There's a free PowerPoint add-in you'll need to download and install on your PowerPoint machines: <a href='https://oscpoint.com/donate' target="_blank">https://oscpoint.com/</a>`,
		width: 12,
	},

	{
		type: 'textinput',
		id: 'remotehost',
		label: 'Remote IP',
		width: 6,
		regex: Regex.IP,
		default: '127.0.0.1',
	},
	{
		type: 'textinput',
		id: 'remoteport',
		label: 'Remote port',
		width: 6,
		regex: Regex.PORT,
		default: 35551,
	},
	{
		id: 'important-line',
		type: 'static-text',
		label: 'The IP address and port of your remote PowerPoint machine.',
		value: `Default remote port is <b>35551</b> - this can be changed using the OSCPoint ribbon tab in PowerPoint.<br/><br/>`,
		width: 12,
	},
	{
		type: 'textinput',
		id: 'localport',
		label: 'Local port',
		width: 8,
		regex: Regex.PORT,
		default: 35550,
	},
	{
		id: 'important-line',
		type: 'static-text',
		label: 'This is the port that this module will use to listen for OSC feedback messages from OSCPoint',
		value: `Default local port is <b>35550</b> - this can be changed using the OSCPoint ribbon tab in PowerPoint.<br/><br/>`,
		width: 12,
	},
	{
		type: 'number',
		id: 'heartbeatTimeout',
		label: 'Connection timeout (seconds, 0 = off)',
		width: 6,
		min: 0,
		max: 120,
		default: 10,
	},
	{
		id: 'heartbeat-line',
		type: 'static-text',
		label: 'Connection check',
		value: `Status only shows OK once OSCPoint actually replies. If nothing is heard for this long, the connection shows as failed. Requires OSC feedbacks to be enabled in OSCPoint.<br/><br/>`,
		width: 12,
	},
	{
		type: 'number',
		id: 'helperPort',
		label: 'OSCPoint Helper port (0 = not used)',
		width: 6,
		min: 0,
		max: 65535,
		default: 35553,
	},
	{
		id: 'helper-line',
		type: 'static-text',
		label: 'OSCPoint Helper',
		value: `Optional Windows app on the PowerPoint machine (same IP as above) for custom shows, go-to-build, notes scroll/size and the VT timer overlay. Its feedback comes back on the local port above.<br/><br/>`,
		width: 12,
	},
	{
		id: 'important-line',
		type: 'static-text',
		label: 'Setting up multiple PowerPoint machines?',
		value: `Each machine will need it's own instance of OSCPoint, and you'll need to tweak the local port below to get feedback from both machines.<br/>
		See the <a href='https://github.com/phuvf/oscpoint/blob/main/CONFIGURATION.md'>configuration examples page on GitHub</a> for full details and example setups.`,
		width: 12,
	},
]

module.exports = configFields
