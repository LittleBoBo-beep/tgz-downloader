const axios = require('axios');
const fs = require("fs");
const {existsSync, mkdirSync} = require("fs");
const logger = require("./logger");
const {join} = require("path");
const urlResolver = require("./url-resolver");
const URL = require('url');
const path = require("path");
const mkdirp = require('mkdirp');
const tar = require('tar');
class Downloader {
	MAX_COUNT = 3;

	async downloadFromIterable (tarballsIterable, options, packagesCache) {
		// 将tarballs缓存的数据转Array
		const tarballs = Array.from(tarballsIterable)
		.map(url => ({url: urlResolver.resolve(url, options), directory: this.convertUrlToDirectory(url)}));
		await this.downloadTarballs(tarballs, options.directory, options.concurrency, packagesCache)
	}
	downloadTarballs (tarballs, baseDirectory = './tarballs', concurrency = Infinity, packagesCache) {
		if (!existsSync(baseDirectory)) {
			mkdirSync(baseDirectory, { recursive: true, mode: '0777' });
		}
		logger([`downloading tarballs (concurrency: ${concurrency})`.bgGreen], { count: tarballs.length });
		return import('p-limit').then(({default: pLimit}) => {
			const limit = pLimit(concurrency);
			const promises = tarballs.map(({url, directory}, i, arr) => {
				const position = `${i + 1}/${arr.length}`;
				logger(['downloading'.cyan, position], url);
				directory = decodeURIComponent(directory)
				if (directory.indexOf('wrap-ansi') !== -1) {
					console.log(directory)
				}
				const packageJson = packagesCache && packagesCache.get(directory) // 检测是否含有packageJSON的缓存信息
				return limit(() => this.downloadFileWithRetry(url, join(baseDirectory, directory), position, this.MAX_COUNT, packageJson));
			});
			return Promise.all(promises);
		})
	}

	/**
	 *	转化url
	 * @param url
	 * @returns {string}
	 */
	convertUrlToDirectory(url) {
		return URL.parse(url)
		.path.split('/-/')[0]
		.substring(1);
	}

	/**
	 * 下载tgz文件与package文件
	 * @param url
	 * @param directory
	 * @param position
	 * @param count
	 * @param packageJson
	 * @returns {Promise<void>}
	 */
	async downloadFileWithRetry (url, directory, position, count, packageJson) {
		try {
			// 开始下载tgz文件和package文件
			const { path, duration = 1000 } = await this.downloadFileAsync(url, { directory }, packageJson);
			if (!existsSync(path)) {
				new Error(`tgz does not exist ${path}`);
			}
			if (this.validateTarball(path)) logger(['downloaded tgz'.green, position], url, `${duration}ms`.gray);
			else {
				new Error('Error downloading tgz, retrying.. ');
			}
		} catch (error) {
			logger(['failed download tgz'.red], error.message, url, count);
			if (count > 0) await this.downloadFileWithRetry(url, directory, position, count - 1, packageJson);
		}
	}
	async downloadFileAsync(file, options = {}, packageJson) {
		const uri = file.split('/'); // 截取uri获取filename
		options.filename = options.filename || uri[uri.length - 1]; // 获取filename
		options.timeout = options.timeout || 20000; // 设置timeout
		const filePath = path.join(options.directory, options.filename);
		const jsonPath = path.join(options.directory, 'package.json');
		if (fs.existsSync(filePath)) {
			logger(['skipping download'.yellow], filePath);
			return Promise.resolve({ path: filePath, duration: 0 });
		}

		let req = axios; // 由于http请求总是失败，换成axios去请求包
		return new Promise((resolve, reject) => {
			const CancelToken = axios.CancelToken;
			let cancel;
			return req.get(
				file,
				{
					responseType: 'stream',
					cancelToken: new CancelToken((c) => {
						cancel = c;
					})
				}
			).then(response => {
				if (response.status === 200) {
					mkdirp(options.directory, (error) => {
						if (error) {
							reject(error.message);
						}
						const file = fs.createWriteStream(filePath);
						response.data.pipe(file);
						packageJson && fs.writeFileSync(jsonPath, JSON.stringify(packageJson))
						file.on('close', function () {
							logger(['download complete'.green], options.filename.gray);
						});
						resolve(filePath);
					});
				} else {
					reject(response.status);
				}
			}).catch(function (error) {
				if (error.response) {
					// 请求成功发出且服务器也响应了状态码，但状态代码超出了 2xx 的范围
					console.log(error.response.data);
					console.log(error.response.status);
					console.log(error.response.headers);
				} else if (error.request) {
					// 请求已经成功发起，但没有收到响应
					// `error.request` 在浏览器中是 XMLHttpRequest 的实例，
					// 而在node.js中是 http.ClientRequest 的实例
					console.log(error.request);
				} else {
					// 发送请求时出了点问题
					cancel();
					console.log('Error', error.message);
				}
				console.log(error.message);
			});
		});
	}

	/**
	 * 验证tarball的包
	 * @param {string} path
	 * @returns {boolean}
	 */
	validateTarball(path) {
		try {
			tar.list({ f: path, sync: true });
			return true;
		} catch (error) {
			logger(['download error'.red, 'deleting tgz'.yellow], path);
			fs.unlinkSync(path);
			console.error(error.message);
			return false;
		}
	}
}

module.exports = Downloader;
