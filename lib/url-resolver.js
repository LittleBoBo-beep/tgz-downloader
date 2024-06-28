/**
 * @param {string} url
 * @param {{ registry?: string }} options
 */
function resolve(url, options = {}) {
	if (!options.registry) return url;

	try {
		const urlObject = new URL(url);
		return urlObject.href.replace(urlObject.origin, options.registry);
	} catch (e) {
		console.error('Error:'.red, e)
	}
}

module.exports = {
	resolve
};
