const semver = require('semver');
const config = require('./config');
const axios = require('axios');
const logger = require("./logger");
// 1. 这个类存储获取到的package.json文件和tarball的包
// 2. 还能够去解析发来的package.json或package-lock.json或包名，通过网络请求去获取包的各种信息
// 3.	之后将网络请求之后的内容，直接返回，传给下个函数，提供给它，让它去执行下载的任务
class Crawler {
	cacheHits = 1;
	registryHits = 1;
	packagesCache = new Map();
	tarballs = new Set(); // 存储tgz包的集合
	/**
	 * 获取dependencies
	 * @param { {name: string, version: string, command?: string, registry?: string, isMoreVersion?: boolean, devDependencies?: boolean, peerDependencies?: boolean} }options
	 * @return {Set<string>}
	 */
	async getDependencies(options) {
		const {name, version, command, isMoreVersion = false} = options;
		const packageJson = await this.retrievePackageVersion(options);
		if (!packageJson) {
			logger(['ERROR'.red], 'failed to retrieve version of package', options.name, options.version);
			return new Set();
		}
		const lists = this.getVersions(packageJson, version, isMoreVersion);
		for (let i = 0, length = lists.length; i < length; i++) {
			const packageJson = lists[i];
			const { dependencies, devDependencies, peerDependencies } = packageJson;
			this.tarballs.add(packageJson.dist.tarball)
			if (dependencies) {
				await this.getDependenciesFrom(dependencies, 'dependency '.magenta);
			}
			if (options.devDependencies && devDependencies) {
			 	await this.getDependenciesFrom(devDependencies, 'devDependency '.magenta);
			}
			if (options.peerDependencies && peerDependencies) {
				await this.getDependenciesFrom(peerDependencies, 'peerDependency '.magenta);
			}
		}
		return this.tarballs;
	}
	/**
	 * 获取后几个版本包，含有排序算法，并且将这几个包返回
	 * @param allPackageVersionsDetails
	 * @param versions
	 * @param isMoreVersions
	 * @return [allPackageVersionsDetails: { dist: { tarball: string }, dependencies: object, devDependencies: object, peerDependencies: object }]
	 */
	getVersions (allPackageVersionsDetails, versions, isMoreVersions) {
		if (!isMoreVersions) {
			const version = this.getMaxSatisfyingVersion(allPackageVersionsDetails, versions)
			return [allPackageVersionsDetails.versions[version]]
		}
		const versionLists = allPackageVersionsDetails.versions;
		const versionsKey = Object.keys(versionLists).sort(semver.compare)
		const versionArr = [];
		// 处理带有alpha与beta的版本号码
		// 首先找到特殊版本的版本号，其次去判断，如果跟特殊版本一样的版本号，就直接去看是否去下载带有特殊版本的版本号
		const sliceVersions = versionsKey.slice(versionsKey.length - versions)
		for (let i = 0, length = sliceVersions.length; i < length; i++) {
			const item = sliceVersions[i];
			versionArr.push(versionLists[item]);
		}
		return versionArr;
	}
	/**
	 * 获取dependencies
	 * @param options
	 * @param {string} options.name
	 * @param {number} options.version
	 * @param {string} options.command
	 * @param {string} options.registry
	 * @param {boolean} options.isModeVersion
	 * @return {Map<string>}
	 */
	getPackages(options) {
		return new Map();
	}

	getPackageJsonDependencies(options) {

	}
	/**
	 * 根据package-lock下载依赖包
	 * @param packageLock
	 * @param command
	 */
	async downloadFromPackageLock (packageLock, command) {
		const dependencies = packageLock.dependencies;
		await this.getDependenciesFrom(dependencies, 'dependency '.magenta);
		return this.tarballs;
	}
	/**
	 *
	 * @param {Object.<string, string>} dependenciesObject
	 * @param outputPrefix
	 */
	async getDependenciesFrom (dependenciesObject, outputPrefix) {
		await Promise.all(Object.entries(dependenciesObject).map(async ([name, version]) => await this.getDependencies({name, version})))
	}

	/**
	 * 获取package.json并添加到缓存packageCache中
	 * @param name
	 * @param version
	 * @param outputPrefix
	 * @param command
	 * @param registry
	 * @returns {Promise<{}>}
	 */
	async retrievePackageVersion({ name, version, outputPrefix = '', command, registry }) {
		const uri = `${config.getRegistry({registry})}/${name}`;
		//  先检测是否含有该name的npm包
		if (this.packagesCache.has(name)) {
			logger(['cache'.yellow, this.cacheHits], `retrieving ${outputPrefix}${name.cyan} ${(version || '').cyan}`);
			// 计数，使用缓存进行+1
			this.cacheHits++;
			return Promise.resolve(this.packagesCache.get(name))
		}
		logger(['registry'.green, this.registryHits], `retrieving ${outputPrefix}${name.cyan} ${(version || '').cyan}`);
		// 计数，注册+1
		this.registryHits++;
		const allPackageVersionsDetails = await this.retryGetRequest(uri);
		this.packagesCache.set(name, allPackageVersionsDetails); // 将包添加进入package的缓存信息中
		return Promise.resolve(allPackageVersionsDetails) // 通过promise返回packageJson内容
	}

	/**
	 * 获取package.json文件
	 * @param {string} uri
	 * @returns {Promise<{}>}
	 */
	async retryGetRequest (uri) {
		try {
			const response = await axios.get(uri, { responseType: 'json' });
			return response.data;
		} catch (err) {
			console.log(err.message);
		}
	}
	/**
	 * 如果没有version，就获取包内dist-tags的version
	 * @param {{ 'dist-tags': { latest: string }, versions: [key: object] }} allPackageVersionsDetails
	 * @param {string | undefined }version
	 * @returns {*}
	 * @private
	 */
	getMaxSatisfyingVersion(allPackageVersionsDetails, version) {
		if (!version || !allPackageVersionsDetails.versions[version]) {
			return allPackageVersionsDetails['dist-tags'].latest;
		} else {
			return version;
		}
		// 匹配版本，取用比较高的版本的包
		// const versions = Object.keys(allPackageVersionsDetails.versions);
		// return semver.maxSatisfying(versions, version);
	}
}

module.exports = Crawler;
