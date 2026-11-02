const { combineRgb } = require('@companion-module/base')

const white = combineRgb(255, 255, 255)
const grey = combineRgb(50, 50, 50)
const online = [{ feedbackId: 'helperOnline', options: {}, style: { bgcolor: combineRgb(0, 110, 0) } }]
const btn = (name, text, actionId, options, extra = {}) => ({
	type: 'simple',
	name,
	style: { text, size: '14', color: white, bgcolor: grey },
	steps: [{ down: [{ actionId, options }], up: [], ...extra }],
	feedbacks: [],
})

module.exports = {
	helperStatus: {
		type: 'simple',
		name: 'Helper status',
		style: { text: 'Helper\n$(OSCPoint:helperStatus)', size: '14', color: white, bgcolor: combineRgb(150, 0, 0) },
		steps: [],
		feedbacks: online,
	},
	helperCustomShow: btn('Start custom show', 'Custom\nshow', 'helperCustomShowStart', { name: '', endRunning: true }),
	helperCustomShowRefresh: btn('Refresh custom show list', 'Refresh\nshows\n($(OSCPoint:customShowCount))', 'helperCustomShowRefresh', {}),
	helperGotoBuild: btn('Go to build', 'Build\n1', 'helperGotoBuild', { slide: '', build: '1' }),
	helperNotesUp: btn('Notes scroll up', 'Notes\n▲', 'helperNotesScroll', { dir: 'up', lines: 3 }),
	helperNotesDown: btn('Notes scroll down', 'Notes\n▼', 'helperNotesScroll', { dir: 'down', lines: 3 }),
	helperNotesTop: btn('Notes to top', 'Notes\nTOP', 'helperNotesScroll', { dir: 'top', lines: 1 }),
	helperNotesRotary: {
		type: 'simple',
		name: 'Notes scroll (rotary) - press = top',
		style: { text: 'Notes\n⟲ scroll ⟳', size: '14', color: white, bgcolor: grey },
		steps: [
			{
				down: [{ actionId: 'helperNotesScroll', options: { dir: 'top', lines: 1 } }],
				up: [],
				rotate_left: [{ actionId: 'helperNotesScroll', options: { dir: 'up', lines: 1 } }],
				rotate_right: [{ actionId: 'helperNotesScroll', options: { dir: 'down', lines: 1 } }],
			},
		],
		feedbacks: [],
	},
	helperFontLarger: btn('Notes text larger', 'Notes\nA+', 'helperNotesFont', { dir: 'larger', times: 1 }),
	helperFontSmaller: btn('Notes text smaller', 'Notes\nA−', 'helperNotesFont', { dir: 'smaller', times: 1 }),
	helperFontRotary: {
		type: 'simple',
		name: 'Notes text size (rotary)',
		style: { text: 'Notes\nA− ⟳ A+', size: '14', color: white, bgcolor: grey },
		steps: [
			{
				down: [],
				up: [],
				rotate_left: [{ actionId: 'helperNotesFont', options: { dir: 'smaller', times: 1 } }],
				rotate_right: [{ actionId: 'helperNotesFont', options: { dir: 'larger', times: 1 } }],
			},
		],
		feedbacks: [],
	},
	helperOverlayToggle: btn('VT timer overlay on/off', 'VT timer\non/off', 'helperOverlay', { action: 'toggle' }),
	helperOverlayBigger: btn('VT timer bigger', 'VT timer\nbigger', 'helperOverlay', { action: 'larger' }),
	helperOverlaySmaller: btn('VT timer smaller', 'VT timer\nsmaller', 'helperOverlay', { action: 'smaller' }),
	helperOverlaySetup: {
		type: 'simple',
		name: 'VT timer positioning mode',
		style: { text: 'VT timer\nposition', size: '14', color: white, bgcolor: grey },
		steps: [
			{ down: [{ actionId: 'helperOverlay', options: { action: 'setup_on' } }], up: [] },
			{ down: [{ actionId: 'helperOverlay', options: { action: 'setup_off' } }], up: [] },
		],
		feedbacks: [],
	},
}
