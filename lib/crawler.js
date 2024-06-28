/**
 * @file 1. 这个类存储获取到的package.json文件和tarball的包
 * 		 2. 还能够去解析发来的package.json或package-lock.json或包名，通过网络请求去获取包的各种信息
 * 		 3. 之后将网络请求之后的内容，直接返回，传给下个函数，提供给它，让它去执行下载的任务
 */
const semver = require('semver');
const config = require('./config');
const axios = require('axios');
const logger = require("./logger");
const utils = require("./utils");

class Crawler {
	cacheHits = 1;
	registryHits = 1;
	// 将package.json与tgz分开存储，如果有访问不到package.json的，可以直接跳过tgz的下载，这样可以减少网络请求
	packagesCache = new Map();
	tarballs = new Set(); // 存储tgz包的集合
	/**
	 * 获取dependencies
	 * @param {{isMoreVersion?: boolean, name: string, version?: number, devDependencies?: boolean, peerDependencies?: boolean, outputPrefix?: string}}options
	 * @return {Set<string>}
	 */
	async getDependencies(options) {
		let {name, version = 'latest', isMoreVersion = false} = options;
		let packageJson = await this.retrievePackageVersion(options);
		if (!packageJson) {
			logger('error', ['ERROR'.red], 'failed to retrieve version of package', name, version);
			return new Set();
		}
		let lists = this.getVersions(packageJson, version, isMoreVersion);
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
	 * @param { string | number }versions
	 * @param isMoreVersions
	 * @return [{ dist: { tarball: string }, dependencies: object, devDependencies: object, peerDependencies: object }]
	 */
	getVersions (allPackageVersionsDetails, versions, isMoreVersions) {
		if (!isMoreVersions) {
			const version = this.getMaxSatisfyingVersion(allPackageVersionsDetails, versions)
			return [allPackageVersionsDetails.versions[version]]
		}
		const versionLists = allPackageVersionsDetails.versions;
		const versionsKey = Object.keys(versionLists).sort((a, b) => semver.compare(a, b))
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
	 * @param { name: string, version: string, command: string, registry: string, isMoreVersion: boolean }options
	 * @return {Map<string>}
	 */

	/**
	 * 根据package-lock下载依赖包
	 * @param {{ packages: object, dependencies?: object }} packageLock
	 * @param command
	 */
	async downloadFromPackageLock (packageLock, command) {
		const dependencies = packageLock.dependencies;
		const packages = packageLock.packages;
		// 部分包中没有dependencies，而是有packages，所以需要处理一下
		if (dependencies) {
			this.cachePackage(dependencies, command.registry, 'dependency '.magenta)
		} else if (packages) {
			const newPackages = {};
			for (const packagesKey in packages) {
				const packageItem = packages[packagesKey];
				const module_index = packagesKey.lastIndexOf('node_modules');
				if (module_index !== -1 && utils.isURL(packageItem.resolved)) {
					const name = packageItem.name || packagesKey.slice(module_index + 1 + 'node_modules'.length);
					if (newPackages[name]) {
						newPackages[name].push(packageItem)
					} else {
						newPackages[name] = [packageItem];
					}
				}
			}
			this.cachePackageFromPackages(newPackages, command.registry, 'dependency '.magenta)
		}
		return this.tarballs;
	}
	cachePackageFromPackages (dependencies, registry, outputPrefix) {
		Object.entries(dependencies).map(async ([name, dependency]) => {
			const uri = `${config.getRegistry({registry})}/${name}`;
			this.packagesCache.set(name, uri)
			for (let i = 0, length = dependency.length; i < length; i++) {
				this.tarballs.add({path: name, url: dependency[i].resolved});
			}
		})
	}

	/**
	 *
	 * @param {Object} packageJson
	 * @param {{devDependencies: object, peerDependencies: object}}  options
	 * @returns {Promise<void>}
	 */
	async downloadFromPackage (packageJson, options) {
		const dependencies = packageJson.dependencies || {};
		if (options.devDependencies && packageJson.devDependencies) {
			Object.assign(dependencies, packageJson.devDependencies)
		}
		if (options.peerDependencies && packageJson.peerDependencies) {
			Object.assign(dependencies, packageJson.peerDependencies)
		}
		const tarballArr = [];
		for (const dependenciesKey in dependencies) {
			const dependency = dependencies[dependenciesKey];
			const tarballsSet = await this.getDependencies({name: dependenciesKey, version: dependency, options, isMoreVersion: false})
			tarballArr.push(...tarballsSet)
		}
		return new Set(tarballArr);
	}
	/**
	 *
	 * @param {Object.<string, number>} dependenciesObject
	 * @param {string} outputPrefix
	 */
	async getDependenciesFrom (dependenciesObject, outputPrefix) {
		await Promise.all(Object.entries(dependenciesObject).map(([name, version]) => {
			return this.getDependencies({name, version, isMoreVersion: false, outputPrefix});
		}))
	}

	/**
	 * 获取package.json并添加到缓存packageCache中
	 * @param name
	 * @param version
	 * @param outputPrefix
	 * @param registry
	 * @returns {Promise<any>}
	 */
	async retrievePackageVersion({ name, version, outputPrefix = '', registry }) {
		const uri = `${config.getRegistry({registry})}/${name}`;
		//  先检测是否含有该name的npm包
		if (this.packagesCache.has(name)) {
			logger('debug', ['cache'.yellow, this.cacheHits], `retrieving ${outputPrefix}${name.cyan} ${(version || '').cyan}`);
			// 计数，使用缓存进行+1
			this.cacheHits++;
			return Promise.resolve(this.packagesCache.get(name))
		}
		if (typeof version === 'number') {
			version += ' versions'
		}
		const allPackageVersionsDetails = await this.retryGetRequest(uri);
		this.packagesCache.set(name, allPackageVersionsDetails); // 将包添加进入package的缓存信息中
		logger('debug', ['registry'.green, this.registryHits], `retrieving ${outputPrefix}${name.cyan} ${(version || '').cyan}`);
		// 计数，注册+1
		this.registryHits++;
		return Promise.resolve(allPackageVersionsDetails) // 通过promise返回packageJson内容
	}

	/**
	 * 获取package.json文件
	 * @param {string} uri
	 * @returns {Promise<{}>}
	 */
	async retryGetRequest (uri) {
		try {
			const response = await axios.request({url: uri, responseType: 'json'});
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

	/**
	 * @desc 缓存package和tarball
	 * @param {Object.<string, string>} dependencies
	 * @param {{ resolved: string }}dependencies
	 * @param registry
	 * @param outputPrefix
	 */
	cachePackage (dependencies, registry, outputPrefix) {
		const dependencyArr = Object.entries(dependencies);
		dependencyArr.forEach(async ([name, dependency]) => {
			// 如果有依赖，就递归获取依赖，并把以来来添加到缓存中
			if (dependency.dependencies) {
				this.cachePackage(dependency.dependencies, registry, outputPrefix);
			}
			if (utils.checkDependencyType(dependency.version)) {
				name = utils.getPackageName(dependency.version);
			}
			const uri = `${config.getRegistry({registry})}/${name}`;
			this.packagesCache.set(name, uri)
			this.tarballs.add({path: name, uri: dependency.resolved});
		})
	}
}

module.exports = Crawler;
