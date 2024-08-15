const { errorLog } = require('./log')
const axios = require('axios');
const {mkdirSync, writeFileSync, unlinkSync, existsSync, createWriteStream} = require("node:fs");
const logger = require("./logger");
const {join} = require("node:path");
const urlResolver = require("./url-resolver");
const path = require("node:path");
const mkdirp = require('mkdirp');
const tar = require('tar');
const {getRegistry} = require("./config");
class Downloader {
    MAX_COUNT = 3;
    TIME_OUT = 5000
    async downloadFromIterable(tarballsIterable, options, packagesCache) {
        // 将tarballs缓存的数据转Array
        const tarballs = Array.from(tarballsIterable)
            .map(({url, path}) => {
                return ({url: urlResolver.resolve(url, options), directory: path})
            });
        if (!existsSync(options.directory)) {
            errorLog(`[${options.directory}]` + 'does not exist'.red);
            mkdirSync(options.directory, {recursive: true, mode: '0777'});
        }
        await this.downloadTarballs(tarballs, options.registry, options.directory, options.concurrency, packagesCache)
    }
    /**
     * 下载tarball文件和package.json文件
     *
     * @param {Array} tarballs - 需要下载的tarball文件列表
     * @param {String} registry - 注册表地址，用于下载package.json文件
     * @param {String} [baseDirectory='./tarballs'] - 下载文件的基目录
     * @param {Number} [concurrency=Infinity] - 并发下载的数量
     * @param {Map} packagesCache - 缓存的包信息，用于检查package.json文件是否已经下载
     * @returns {Promise} - 返回一个Promise对象，包含所有下载任务的结果
     */
    downloadTarballs(tarballs, registry, baseDirectory = './tarballs', concurrency = Infinity, packagesCache) {
        // 记录调试信息，显示下载任务的并发数量
        logger('debug', [`downloading tarballs and package.json (concurrency: ${concurrency})`.bgGreen], {count: tarballs.length});
        // 导入p-limit库，用于控制并发数量
        return import('p-limit').then(({default: pLimit}) => {
            // 创建一个并发控制器
            const limit = pLimit(concurrency);
            // 将缓存的键和值分别存入数组
            const keys = [...packagesCache.keys()];
            const values = [...packagesCache.values()];
            // 存储所有的下载任务Promise
            const promises = [];
            // 先下载package.json文件
            for (let i = 0, length = values.length; i < length; i++) {
                // 记录当前任务的位置
                const position = `${i + 1}/${length}`;
                // 记录调试信息，显示正在下载的package.json文件名和位置
                logger('debug', ['downloading'.cyan, position], keys[i]);
                // 拼接package.json文件的保存路径
                const jsonPath = baseDirectory + '/' + keys[i];
                // 将下载任务添加到Promise数组中
                promises.push(limit(() => this.requestPackageJson(values[i], this.TIME_OUT, jsonPath, 2, position, keys[i], registry)));
            }
            // 再下载tarball文件
            for (let i = 0, length = tarballs.length; i < length; i++) {
                // 解构当前tarball的信息
                let { url, directory } = tarballs[i];
                // 记录当前任务的位置
                const position = `${i + 1}/${length}`;
                // 记录调试信息，显示正在下载的tarball文件URL和位置
                logger('debug', ['downloading'.cyan, position], url);
                // 解码目录名
                directory = decodeURIComponent(directory)
                // 如果对应的package.json文件下载失败，则跳过该tarball文件的下载
                const packageJson = packagesCache && packagesCache.get(directory)
                // 将下载任务添加到Promise数组中
                promises.push(limit(() => this.downloadFileWithRetry(url, join(baseDirectory, directory), position, this.MAX_COUNT, packageJson)))
            }
            // 返回所有下载任务的Promise结果
            return Promise.all(promises);
        })
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
    async downloadFileWithRetry(url, directory, position, count, packageJson) {
        try {
            const duration = 1000;
            // 开始下载tgz文件和package文件
            const startTime = Date.now();
            const {path} = await this.downloadFileAsync(url, {directory, duration});
            const endTime = Date.now();
            if (!existsSync(path)) {
                new Error(`tgz does not exist ${path}`);
            }
            const isSuccess = this.validateTarball(path)
            if (isSuccess) logger('debug', ['downloaded tgz'.green, position], url, `${endTime - startTime}ms`.gray);
            else {
                new Error('Error downloading tgz, retrying.. ');
            }
        } catch (error) {
            logger('error', ['failed download tgz'.red], error.message, url, count);
            if (count > 0) await this.downloadFileWithRetry(url, directory, position, count - 1, packageJson);
        }
    }

    /**
     * 下载tgz文件
     * @param file
     * @param options
     * @returns {Promise<unknown>}
     */
    async downloadFileAsync(file, options = {}) {
        const uri = file.split('/'); // 截取uri获取filename
        options.filename = options.filename || uri[uri.length - 1]; // 获取filename
        options.timeout = options.timeout || 0; // 设置timeout
        let filePath = path.join(options.directory, options.filename);
        // const jsonPath = path.join(options.directory, 'package.json');
        if (existsSync(filePath)) {
            logger('debug', ['skipping download'.yellow], filePath);
            return Promise.resolve({path: filePath});
        }
        let req = axios; // 由于http请求总是失败，换成axios去请求包
        return new Promise((resolve, reject) => {
            const CancelToken = axios.CancelToken;
            let cancel;
            return req.get(
                file,
                {
                    responseType: 'stream',
                    timeout: options.timeout,
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
                        try {
                            const has = filePath.indexOf('?');
                            if (has !== -1) {
                                filePath = filePath.slice(0, has)
                            }
                            const file = createWriteStream(filePath);
                            response.data.pipe(file);
                        file.on('close', function () {
                            resolve({path: filePath});
                        });
                    } catch (e) {
                        console.error(['createWriteStream'.red], e.message)
                    }
                    });
                } else {
                    reject(response.status);
                }
            }).catch(function (error) {
                // if (error.response) {
                    // 请求成功发出且服务器也响应了状态码，但状态代码超出了 2xx 的范围
                    // console.log(error);
                    // console.log(error.response.status);
                    // console.log(error.response.headers);
                // } else if (error.request) {
                    // 请求已经成功发起，但没有收到响应
                    // `error.request` 在浏览器中是 XMLHttpRequest 的实例，
                    // 而在node.js中是 http.ClientRequest 的实例
                    // console.log(error.message);
                // } else {
                    // 发送请求时出了点问题
                    cancel();
                    console.log('Error'.red, error.message, file);
                // }
                // console.log(error.message);
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
            tar.list({f: path, sync: true});
            return true;
        } catch (error) {
            logger('error', ['download error'.red, 'deleting tgz'.yellow], path);
            // 删除文件
            unlinkSync(path);
            console.error(error.message);
            return false;
        }
    }

    /**
     * 根据给定的URI请求package.json文件
     * 如果本地已经存在package.json，则不会重复下载
     * @param {string|{_id: string, name: string, version: string}} uri - 远程包的URI或本地包的对象
     * @param {number} timeout - 请求的超时时间
     * @param {string} jsonPath - 本地JSON文件的路径
     * @param {number} maxCount - 最大重试次数，默认为2
     * @param {string} position - 当前包的位置描述
     * @param {string} name - 包的名称
     * @param {string} registry - 包的注册表
     * @returns {Promise} 返回一个Promise对象，解析为package.json文件的路径
     */
    requestPackageJson(uri, timeout, jsonPath, maxCount = 2, position, name, registry) {

        // 检查本地是否已经存在package.json
        if (existsSync(jsonPath + '/package.json')) {
            // 如果uri是对象，将其转换为注册表中的URL
            if (typeof uri === 'object') {
                uri = getRegistry(registry) + '/' + uri._id;
            }
            // 记录跳过下载的日志
            logger('debug', ['skipping download'.yellow, position], uri.gray);
            // 返回一个已经解析的Promise，包含本地package.json的路径
            return Promise.resolve({path: jsonPath + '/package.json'});
        }

        // 记录请求开始时间
        const startTime = Date.now();

        // 如果uri是对象，且本地路径不存在，则创建路径，并记录下载完成时间
        if (typeof uri === 'object') {
            if (!existsSync(jsonPath)) {
                mkdirSync(jsonPath, {recursive: true, mode: '0777'});
            }
            writeFileSync(jsonPath + '/package.json', JSON.stringify(uri))
            const endTime = Date.now();
            uri = getRegistry(registry) + '/' + uri._id;
            // 记录下载完成的日志
            logger('debug', ['downloaded package.json'.green, position], uri, `${endTime - startTime}ms`.gray);
            return Promise.resolve(jsonPath + '/package.json')
        }

        // 使用axios发送请求，并处理响应
        return axios.request({url: uri, responseType: 'json', timeout})
            .then(({data: packageJson}) => {
                if (!existsSync(jsonPath)) {
                    mkdirSync(jsonPath, {recursive: true, mode: '0777'});
                }
                packageJson && writeFileSync(jsonPath + '/package.json', JSON.stringify(packageJson))
                const endTime = Date.now();
                // 记录下载完成的日志
                logger('debug', ['downloaded package.json'.green, position], uri, `${endTime - startTime}ms`.gray);
            })
            .catch(error => {
                // 记录下载错误的日志
                logger('error', ['failed download packageJson'.red], uri, error.message, (maxCount - 1 + '').green);
                if (maxCount > 0) {
                    maxCount--;
                    // 递归重试下载
                    return this.requestPackageJson(uri, timeout, jsonPath, maxCount, position, name, registry)
                } else {
                    // 最大重试次数达到，记录错误日志
                    logger('error', ['failed download packageJson'], uri)
                }
            })
    }
}

module.exports = Downloader;
