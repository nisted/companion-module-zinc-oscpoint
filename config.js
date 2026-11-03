const { Regex } = require('@companion-module/base')

/** The connection fields that hold settings, and can be handed over to the 'Connection: set settings' action */
const CONN_FIELDS = ['remotehost', 'remoteport', 'localport', 'heartbeatTimeout', 'helperPort']

/** The connection fields that hold a number */
const NUMBER_FIELDS = new Set(['remoteport', 'localport', 'heartbeatTimeout', 'helperPort'])

/** Allowed whole-number range for each number field: real ports are 1-65535; 0 = off where the page allows it */
const NUMBER_RANGES = {
	remoteport: [1, 65535],
	localport: [1, 65535],
	heartbeatTimeout: [0, 120],
	helperPort: [0, 65535],
}

/** The connection fields that are number boxes on the connection page (the others are text boxes) */
const NUMBER_TYPE_FIELDS = new Set(['heartbeatTimeout', 'helperPort'])

const BY_ACTION_TIP =
	"Hands this field over to the 'Connection: set settings' action, so a button or a trigger can change it (from a variable, say). " +
	"While it's ticked, the field's locked here and shows what the action last set. Untick it and you get back what you'd typed before."

/** Whether a connection field is ticked "Can be set by the action" */
const isTicked = (config, f) => config?.[`${f}_byAction`] === true

/** A field's current value, for the locked line on the connection page */
const shownValue = (config, f) => {
	const v = String(config?.[f] ?? '').trim()
	if (v === '') return 'blank'
	if (f === 'heartbeatTimeout' && Number(v) === 0) return '0 (off)'
	if (f === 'helperPort' && Number(v) === 0) return '0 (not used)'
	return v
}

/** A connection field, plus its "Can be set by the action" tick and what it shows while ticked */
const lock = (config, field) => [
	{ ...field, isVisibleExpression: `!$(options:${field.id}_byAction)` },
	{
		type: 'static-text',
		id: `${field.id}_locked`,
		label: field.label,
		width: field.width,
		value: `Set by the 'Connection: set settings' action: ${shownValue(config, field.id)}`,
		isVisibleExpression: `$(options:${field.id}_byAction)`,
	},
	{
		type: 'checkbox',
		id: `${field.id}_byAction`,
		label: 'Can be set by the action',
		width: 3,
		default: false,
		disableAutoExpression: true,
		tooltip: BY_ACTION_TIP,
	},
]

const fieldsFor = (config) => [
	{
		id: 'important-line',
		type: 'static-text',
		label: 'OSCPoint lets you drive and keep an eye on PowerPoint on Windows, all over OSC.',
		value: `First things first: each PowerPoint machine needs the free OSCPoint add-in installed. Grab it here: <a href='https://oscpoint.com/donate' target="_blank">https://oscpoint.com/</a>`,
		width: 12,
	},
	{
		id: 'byaction-line',
		type: 'static-text',
		label: 'Changing these from a button or a trigger',
		value: `Want a button, a trigger or a variable to change one of these settings? Tick <b>Can be set by the action</b> next to it, then use the <b>Connection: set settings</b> action.<br/><br/>`,
		width: 12,
	},
	...lock(config, {
		type: 'textinput',
		id: 'remotehost',
		label: 'Remote IP',
		width: 6,
		regex: Regex.IP,
		default: '127.0.0.1',
	}),
	...lock(config, {
		type: 'textinput',
		id: 'remoteport',
		label: 'Remote port',
		width: 6,
		regex: Regex.PORT,
		default: 35551,
	}),
	{
		id: 'important-line',
		type: 'static-text',
		label: 'Where the PowerPoint machine lives on the network. Its IP address and port, basically.',
		value: `The remote port is <b>35551</b> out of the box. Want a different one? Change it on the OSCPoint ribbon tab in PowerPoint.<br/><br/>`,
		width: 12,
	},
	...lock(config, {
		type: 'textinput',
		id: 'localport',
		label: 'Local port',
		width: 8,
		regex: Regex.PORT,
		default: 35550,
	}),
	{
		id: 'important-line',
		type: 'static-text',
		label: 'The port I listen on for OSC feedback coming back from OSCPoint.',
		value: `The local port is <b>35550</b> out of the box. You can change it on the OSCPoint ribbon tab in PowerPoint too.<br/><br/>`,
		width: 12,
	},
	...lock(config, {
		type: 'number',
		id: 'heartbeatTimeout',
		label: 'Connection timeout (seconds, 0 = off)',
		width: 6,
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
	...lock(config, {
		type: 'number',
		id: 'helperPort',
		label: 'OSCPoint Helper port (0 = not used)',
		width: 6,
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
		id: 'important-line',
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

/** Each connection field's label, as it shows on the connection page */
const CONN_LABELS = Object.fromEntries(
	fieldsFor(undefined)
		.filter((f) => CONN_FIELDS.includes(f.id))
		.map((f) => [f.id, f.label]),
)

module.exports = { fieldsFor, CONN_FIELDS, CONN_LABELS, NUMBER_FIELDS, NUMBER_RANGES, NUMBER_TYPE_FIELDS, isTicked }
