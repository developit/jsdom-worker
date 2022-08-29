// eslint-disable-next-line
module.exports = {
	env: {
		node: true,
		browser: true,
		es2021: true,
	},
	extends: ['eslint-config-developit', 'prettier', 'eslint:recommended'],
	ignorePatterns: ['**/dist/**'],
};
