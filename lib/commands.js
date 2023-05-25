const Crawler = require('./crawler');
const Downloader = require('./downloader');
const { retrieveFile } = require('./uri-resolver')
/**
 * 通过package-lock获取tgz包
 * @param uri
 * @param command
 * @returns {Promise<void>}
 */
async function packageLockCommand(uri, command) {
	const crawler = new Crawler();
	const packageLock = await retrieveFile(uri);
	const tarballs = await crawler.downloadFromPackageLock(packageLock, command)
	const downloader = new Downloader();
	await downloader.downloadFromIterable(tarballs, {...command}, crawler.packagesCache)
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
	const tarballsSet = await crawler.getDependencies(options)
	// tarballSet其中保存了所有的需要下载的tgz包的路径信息
	// packageCache保存了所有需要下载的package.json的路径信息
	const downloader = new Downloader();
	await downloader.downloadFromIterable(tarballsSet, options, crawler.packagesCache);
}

/**
 * 处理单个包的多个版本的下载
 * @param name
 * @param number
 * @param command
 */
async function packagesCommand(name, number, command) {
	const crawler = new Crawler();
	const options = {name, version: number, ...command, isMoreVersion: true}
	const tarballsSet = await crawler.getDependencies(options)
	const downloader = new Downloader();
	await downloader.downloadFromIterable(tarballsSet, options, crawler.packagesCache);
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
