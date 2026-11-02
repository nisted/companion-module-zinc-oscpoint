const filePresets = require('./presets/files.js')
const mediaPresets = require('./presets/media.js')
const slidesPresets = require('./presets/slides.js')
const syncPresets = require('./presets/sync.js')
const helperPresets = require('./presets/helper.js')

module.exports = function (self) {
	let presets = { ...filePresets, ...mediaPresets, ...slidesPresets, ...syncPresets, ...helperPresets }
	//let presets = { ...filePresets, ...mediaPresets }
	const structure = [{
		id: 'slides_section',
		name: 'Basics',
		// description: 'Slide show control and feedback',
		definitions: [
			{
				id: 'slides_control',
				type: 'simple',
				name: 'Slide control',
				text: '',
				presets: ['prev', 'next', 'prevSection', 'nextSection'],
			},
			{
				id: 'slideshow_control',
				type: 'simple',
				name: 'Slide show control',
				text: '',
				presets: ['startSlideshowFromStart', 'startSlideshowFromCurrent', 'stopSlideshow', 'pauseSlideshow', 'resumeSlideshow', 'white', 'black', 'laser', 'setWallpaper'],
			},
			{
				id: 'slides_feedback',
				type: 'simple',
				name: 'Slide show feedback',
				// description: 'Live slide show status reporting',
				presets: ['showState', 'presentationName', 'slideNumbers', 'buildNumbers', 'notes'],
			},
		],
	},
	{
		id: 'sync_section',
		name: 'Main / backup sync',
		definitions: [
			{
				id: 'sync_group',
				type: 'simple',
				name: 'Follow another connection',
				description:
					'Use on the BACKUP connection. "Main" = label of the connection to follow - edit to match yours. For automatic follow, add a trigger: event "On variable change" for $(Main:currentSlide), $(Main:buildPosition) and $(Main:state), action "Sync: follow another connection".',
				presets: ['syncNow', 'syncStatus', 'openMatching', 'openAndSync'],
			},
		],
	},
	{
		id: 'helper_section',
		name: 'OSCPoint Helper',
		definitions: [
			{
				id: 'helper_shows',
				type: 'simple',
				name: 'Custom shows & builds',
				description: 'Needs the OSCPoint Helper app running on the PowerPoint machine. Pick the show in the button\'s action.',
				presets: ['helperStatus', 'helperCustomShow', 'helperCustomShowRefresh', 'helperGotoBuild'],
			},
			{
				id: 'helper_notes',
				type: 'simple',
				name: 'Presenter View notes',
				presets: ['helperNotesUp', 'helperNotesDown', 'helperNotesTop', 'helperNotesRotary', 'helperFontLarger', 'helperFontSmaller', 'helperFontRotary'],
			},
			{
				id: 'helper_overlay',
				type: 'simple',
				name: 'VT remaining-time overlay',
				presets: ['helperOverlayToggle', 'helperOverlayBigger', 'helperOverlaySmaller', 'helperOverlaySetup'],
			},
		],
	},
	{
		id: 'media_section',
		name: 'Media control',
		// optional description
		definitions: [
			{
				id: 'media_control',
				type: 'simple',
				name: 'Media control',
				text: '',
				presets: ['playpause', 'stopMedia', 'previousBookmark', 'nextBookmark', 'lastTenSeconds'],
			},
			{
				id: 'media_feedback',
				type: 'simple',
				name: 'Media feedback',
				text: '',
				presets: ['mediaState', 'mediaDuration', 'mediaPosition', 'mediaRemaining', 'mediaStartEndPoints'],
			},
		],
	},
	{
		id: 'file_section',
		name: 'File management',
		// optional description
		definitions: [
			{
				id: 'file_group_1',
				type: 'simple',
				name: 'File access configuration',
				description: 'When enabled, OSCPoint will scan a specific folder (the active folder) for .ppt and .pptx files.',
				presets: ['fileAccessEnabled', 'setActiveFolder', 'activeFolder'],
			},
			{
				id: 'file_selection_group',
				type: 'simple',
				name: 'File selection',
				description: 'Use these presets to navigate through the file list to select the file to open.',
				presets: ['plus1', 'plus10', 'minus1', 'minus10', 'selectedFileName', 'openFile'],
			},
		],
	},


	]
	self.setPresetDefinitions(structure, presets)
}
