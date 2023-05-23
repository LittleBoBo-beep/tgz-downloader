const axios = require('axios');
const fs = require("fs");
class Downloader {
	tarball;
	packagesCache;
	constructor(options) {
		const { tarballs, packagesCache } = options;
		this.tarballs = tarballs;
		this.packagesCache = packagesCache;
		this.options = options;
	}
	downloadFile () {

	}
	downloadFromIterable () {
		console.log('this', this)
	}
	// 验证tarball的包
	validateTarball(path) {
		try {
			tar.list({ f: path, sync: true });
			return true;
		} catch (error) {
			logger(['download error'.red, 'deleting tgz'.yellow], path);
			fs.unlinkSync(path);
			return false;
		}
	}
}

module.exports = Downloader;
