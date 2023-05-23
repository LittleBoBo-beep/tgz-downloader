const semver = require('semver');
const config = require('./config');
const axios = require('axios');
const {getRegistry} = require("./config");
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
		const packageJsons = await this.retrievePackageVersion(options);
		this.packagesCache.set(name, packageJsons);
		const lists = this.getVersions(packageJsons, version, isMoreVersion);
		for (let i = 0, length = lists.length; i < length; i++) {
			const packageJson = lists[i];
			this.tarballs.add(packageJson.dist.tarball)
			await this.getDependenciesFrom(packageJson.dependencies, 'dependency '.magenta);
			if (options.devDependencies) {
				await this.getDependenciesFrom(packageJson.devDependencies, 'devDependency '.magenta);
			}
			if (options.peerDependencies) {
				await this.getDependenciesFrom(packageJson.peerDependencies, 'peerDependency '.magenta);
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
		const packages = [];
		return packages;
	}

	getPackageJsonDependencies(options) {

	}

	/**
	 *
	 * @param {Object.<string, string>} dependenciesObject
	 * @param outputPrefix
	 */
	getDependenciesFrom (dependenciesObject, outputPrefix) {
		Object.entries(dependenciesObject).forEach(([name, version]) => this.getDependencies({name, version}))
	}
	async retrievePackageVersion({ name, version, command, registry  }) {
		const uri = `${config.getRegistry({registry})}/${name}`;
		return await this.retryGetRequest(uri);
	}
	async retryGetRequest (uri) {
		try {
			const response = await axios.request({url: uri, responseType: 'json', timeout: 0});
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
