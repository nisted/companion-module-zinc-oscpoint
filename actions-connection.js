// 'Connection: set settings': lets a button or a trigger change the connection fields
// ticked "Can be set by the action" on the connection page.

const { CONN_FIELDS, CONN_LABELS, NUMBER_FIELDS, NUMBER_RANGES, isTicked } = require('./config')

module.exports = function (self) {
	const ticked = CONN_FIELDS.filter((f) => isTicked(self.config, f))
	return {
		connection_set: {
			name: 'Connection: set settings',
			description:
				'Changes this connection\'s settings, for the fields ticked "Can be set by the action" on the connection page. Blank = leave as is. Put it in a trigger on "variable changed" to drive the connection from a variable.',
			options: ticked.length
				? ticked.map((f) => ({
						type: 'textinput',
						id: f,
						label: CONN_LABELS[f],
						default: '',
						useVariables: true,
						tooltip: NUMBER_FIELDS.has(f)
							? `A whole number from ${NUMBER_RANGES[f][0]} to ${NUMBER_RANGES[f][1]}. Blank = leave as is.`
							: 'Blank = leave as is.',
					}))
				: [
						{
							type: 'static-text',
							id: 'none',
							label: 'Nothing to set yet',
							value:
								'Tick "Can be set by the action" next to a field on this connection\'s settings page first. Then it turns up here, ready to set.',
						},
					],
			callback: async ({ options }) => {
				await self.setConnectionByAction(options)
			},
		},
	}
}
