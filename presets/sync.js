const { combineRgb } = require('@companion-module/base')

const syncOpts = {
	sourceSlide: '$(Main:currentSlide)',
	sourceBuild: '$(Main:buildPosition)',
	sourceState: '$(Main:state)',
	mirrorStartStop: true,
	stepDelay: 30,
	startDelay: 1000,
}
const mismatchOpts = { sourceSlide: '$(Main:currentSlide)', sourceBuild: '$(Main:buildPosition)' }
const openOpts = { fileName: '$(Main:presentationName)' }

// "Main" is a placeholder for the label of the connection being followed.
module.exports = {
	syncNow: {
		type: 'simple',
		name: 'Sync to Main now',
		style: {
			text: 'SYNC\\nto Main',
			size: '14',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 102, 204),
		},
		steps: [{ down: [{ actionId: 'syncToSource', options: syncOpts }], up: [] }],
		feedbacks: [{ feedbackId: 'syncMismatch', options: mismatchOpts, style: { bgcolor: combineRgb(200, 0, 0) } }],
	},
	syncStatus: {
		type: 'simple',
		name: 'Main vs this machine (slide.build)',
		style: {
			text: 'Main $(Main:currentSlide).$(Main:buildPosition)\\nHere $(OSCPoint:currentSlide).$(OSCPoint:buildPosition)',
			size: '14',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 120, 0),
		},
		steps: [],
		feedbacks: [{ feedbackId: 'syncMismatch', options: mismatchOpts, style: { bgcolor: combineRgb(200, 0, 0) } }],
	},
	openMatching: {
		type: 'simple',
		name: "Open Main's presentation here",
		style: {
			text: 'OPEN\\n$(Main:presentationName)',
			size: '7',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(60, 60, 60),
		},
		steps: [{ down: [{ actionId: 'openMatchingPresentation', options: openOpts }], up: [] }],
		feedbacks: [],
	},
	openAndSync: {
		type: 'simple',
		name: "Open Main's presentation, then sync",
		style: {
			text: 'OPEN +\\nSYNC',
			size: '14',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(102, 0, 153),
		},
		steps: [
			{
				down: [
					{ actionId: 'openMatchingPresentation', options: openOpts },
					{ actionId: 'syncToSource', options: syncOpts, delay: 3000 },
				],
				up: [],
			},
		],
		feedbacks: [],
	},
}
