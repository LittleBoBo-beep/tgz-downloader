const axios = require('axios');
const fs = require("node:fs");
const {existsSync, mkdirSync} = require("node:fs");
const {mkdirSync, writeFileSync, unlinkSync, existsSync, createWriteStream} = require("node:fs");
const logger = require("./logger");
const {join} = require("node:path");
const urlResolver = require("./url-resolver");
const URL = require('node:url');
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
            .map(url => ({url: urlResolver.resolve(url, options), directory: this.convertUrlToDirectory(url)}));
        if (!existsSync(options.directory)) {
            console.log(options.directory + 'does not exist');
            mkdirSync(options.directory, {recursive: true, mode: '0777'});
        }
        await this.downloadTarballs(tarballs, options.registry, options.directory, options.concurrency, packagesCache)
    }

    async downloadPackageJson(packagesCache, baseDirectory = './tarballs', concurrency = Infinity) {
        // logger('debug', [`downloading cachePackage (concurrency: ${concurrency})`.bgGreen], {count: packagesCache.size});
        // return import('p-limit').then(({default: pLimit}) => {
        //     const pLimitPromise = pLimit(concurrency);
        //     // const promises = [];
        //     const keys = [...packagesCache.keys()];
        //     const values = [...packagesCache.values()];
        //     values.forEach((value, i) => {
        //         const position = `${i + 1}/${packagesCache.size}`;
        //         logger('debug', ['downloading'.cyan, position], keys[i]);
        //         const jsonPath = baseDirectory + '/' + keys[i];
        //         if (!existsSync(jsonPath)) {
        //             mkdirSync(jsonPath, {recursive: true, mode: '0777'});
        //         }
        //         promises.push(pLimitPromise(() => this.requestPackageJson(value, 0, jsonPath, 2, position, keys[i])))
        //     })
        //     return promises;
        // })
    }

    downloadTarballs(tarballs, registry, baseDirectory = './tarballs', concurrency = Infinity, packagesCache) {
        logger('debug', [`downloading tarballs and package.json (concurrency: ${concurrency})`.bgGreen], {count: tarballs.length});
        return import('p-limit').then(({default: pLimit}) => {
            const limit = pLimit(concurrency);
            const keys = [...packagesCache.keys()];
            const values = [...packagesCache.values()];
            const promises = [];
            for (let i = 0, length = values.length; i < length; i++) {
                const position = `${i + 1}/${length}`;
                logger('debug', ['downloading'.cyan, position], keys[i]);
                const jsonPath = baseDirectory + '/' + keys[i];
                promises.push(limit(() => this.requestPackageJson(values[i], this.TIME_OUT, jsonPath, 2, position, keys[i], registry)));
            }
            for (let i = 0, length = tarballs.length; i < length; i++) {
                let { url, directory } = tarballs[i];
                const position = `${i + 1}/${length}`;
                logger('debug', ['downloading'.cyan, position], url);
                directory = decodeURIComponent(directory)
                const packageJson = packagesCache && packagesCache.get(directory)
                promises.push(limit(() => this.downloadFileWithRetry(url, join(baseDirectory, directory), position, this.MAX_COUNT, packageJson)))
            }
            return Promise.all(promises);
        })
    }

    /**
     *    转化url
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
    async downloadFileWithRetry(url, directory, position, count, packageJson) {
        try {
            const duration = 1000;
            // 开始下载tgz文件和package文件
            const startTime = Date.now();
            const {path} = await this.downloadFileAsync(url, {directory, duration}, packageJson, count);
            const endTime = Date.now();
            if (!existsSync(path)) {
                new Error(`tgz does not exist ${path}`);
            }
            if (this.validateTarball(path)) logger('debug', ['downloaded tgz'.green, position], url, `${endTime - startTime}ms`.gray);
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
     * @param packageJson
     * @param count
     * @returns {Promise<unknown>}
     */
    async downloadFileAsync(file, options = {}, packageJson, count) {
        const uri = file.split('/'); // 截取uri获取filename
        options.filename = options.filename || uri[uri.length - 1]; // 获取filename
        options.timeout = options.timeout || 0; // 设置timeout
        const filePath = path.join(options.directory, options.filename);
        const jsonPath = path.join(options.directory, 'package.json');
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
                        const file = createWriteStream(filePath);
                        response.data.pipe(file);
                        // 设置延时器，增加容错率
                        // setTimeout(() => {
                        // if (packageJson && this.isHttpUrl(packageJson)) {
                        //     this.requestPackageJson(packageJson, 0, count).then(({data: packageJson}) => {
                        //         packageJson && fs.writeFileSync(jsonPath, JSON.stringify(packageJson))
                        //     });
                        // } else {
                        //     packageJson && fs.writeFileSync(jsonPath, JSON.stringify(packageJson))
                        // }
                        // }, options.duration)
                        file.on('close', function () {
                        logger('debug', ['download complete'.green], options.filename.gray);
                            resolve({path: filePath});
                        });
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
            unlinkSync(path);
            console.error(error.message);
            return false;
        }
    }

    requestPackageJson(uri, timeout, jsonPath, maxCount = 2, position, name, registry) {

        if (existsSync(jsonPath + '/package.json')) {
            if (typeof uri === 'object') {
                uri = getRegistry(registry) + '/' + uri._id;
            }
            logger('debug', ['skipping download'.yellow, position], uri.gray);
            return Promise.resolve({path: jsonPath + '/package.json'});
        }
        const startTime = Date.now();
        if (typeof uri === 'object') {
            if (!existsSync(jsonPath)) {
                mkdirSync(jsonPath, {recursive: true, mode: '0777'});
            }
            writeFileSync(jsonPath + '/package.json', JSON.stringify(uri))
            const endTime = Date.now();
            uri = getRegistry(registry) + '/' + uri._id;
            logger('debug', ['downloaded package.json'.green, position], uri, `${endTime - startTime}ms`.gray);
            return Promise.resolve(jsonPath + '/package.json')
        }
        return axios.request({url: uri, responseType: 'json', timeout})
            .then(({data: packageJson}) => {
                if (!existsSync(jsonPath)) {
                    mkdirSync(jsonPath, {recursive: true, mode: '0777'});
                }
                packageJson && writeFileSync(jsonPath + '/package.json', JSON.stringify(packageJson))
                const endTime = Date.now();
                logger('debug', ['downloaded package.json'.green, position], uri, `${endTime - startTime}ms`.gray);
            })
            .catch(error => {
            logger('error', ['failed download packageJson'.red], uri, error.message, (maxCount - 1 + '').green);
            if (maxCount > 0) {
                maxCount--;
                return this.requestPackageJson(uri, timeout, jsonPath, maxCount)
            } else {
                logger('error', ['failed download packageJson'], uri)
            }
        })
    }

    isHttpUrl(str) {
        const parsedUrl = URL.parse(str);
        return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    }

    downloadFilePackage(packageDetail, options) {
        try {
            writeFileSync(options.directory, JSON.stringify(packageDetail));
        } catch (error) {
            console.log(`[${'error'.red}] ${error.message}`)
        }
    }
}

module.exports = Downloader;
