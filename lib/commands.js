/**
 * @file 处理指令以及参数信息，提供服务
 */
const path = require('node:path')
const Crawler = require('./crawler');
const Downloader = require('./downloader');
const { retrieveFile } = require('./uri-resolver')
const NpmCommand = require("./npmCommand");
const {debugLog} = require("./log");
/**
 * 通过package-lock获取tgz包
 * @param uri
 * @param command
 */
async function packageLockCommand(uri, command) {
	// 首先收集依赖信息
	const crawler = new Crawler();
	const packageLock = await retrieveFile(uri);
	await crawler.downloadFromPackageLock(packageLock, command)
	const downloader = new Downloader();
	await downloader.downloadFromIterable(crawler.tarballs, {...command}, crawler.packagesCache)
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
	const options = {name, version: Number(number), ...command, isMoreVersion: true}
	const tarballsSet = await crawler.getDependencies(options)
	const downloader = new Downloader();
	await downloader.downloadFromIterable(tarballsSet, options, crawler.packagesCache);
}

async function packageJsonCommand (uri, command) {
	try {
		const result = await NpmCommand.generatorPackageLock(uri)
		console.log('[generator Package-lock.json]'.grey, result)
	} catch (e) {
		console.log('[Error]'.red, e.message)
	}
	const crawler = new Crawler();
	const packageLock = retrieveFile(path.join(path.dirname(uri), 'package-lock.json'));
	await crawler.downloadFromPackageLock(packageLock, command)
	const downloader = new Downloader();
	await downloader.downloadFromIterable(crawler.tarballs, {...command}, crawler.packagesCache)
	// const tarballs = await crawler.downloadFromPackage(packageJson, command)
	// const downloader = new Downloader();
	// await downloader.downloadFromIterable(tarballs, {...command}, crawler.packagesCache)
}

async function searchCommand(keyword, command) {
	const crawler = new Crawler();
	const options = {name: keyword, ...command, isMoreVersion: false}
	const tarballsSet = await crawler.getDependencies(options)
	tarballsSet.forEach((tarball) => {
		debugLog(tarball)
		console.info('dependence'.green, tarball)
	})
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
	parseConcurrency,
	packageJsonCommand,
	searchCommand
}
