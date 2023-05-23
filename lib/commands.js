const Crawler = require('./crawler');
const Downloader = require('./downloader');
function packageLockCommand() {

}

/**
 * 获取单个包的源文件
 * @param name
 * @param version
 * @param command
 */
async function packageCommand(name, version, command) {
	const crawler = new Crawler();
	const options = {name, version, ...command, isMoreVersion: false}
	const tarballs = await crawler.getDependencies(options)
	const downloader = new Downloader({tarballs, options, packagesCache: crawler.packagesCache});
	await downloader.downloadFromIterable();
}

/**
 * 处理单个包的多个版本的下载
 * @param name
 * @param number
 * @param command
 */
function packagesCommand(name, number, command) {
	const crawler = new Crawler();
	const tarballs = crawler.getDependencies({
		name, number, ...command, isModeVersion: true
	})
	// console.log('tarballs', tarballs);
}

/**
 * 处理参数信息
 * @param value
 * @returns {number}
 */
function parseConcurrency(value) {
	const concurrency = parseInt(value, 10);
	if (isNaN(concurrency) || concurrency < 1) {
		throw new Error('concurrency value should be greater than 0.');
	}
	return concurrency;
}

module.exports = {
	packageCommand,
	packagesCommand,
	packageLockCommand,
	parseConcurrency
}
