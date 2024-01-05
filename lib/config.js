/**
 * @file 配置文件，主要对npm镜像源进行处理，首先使用输入的镜像源其次获取系统的存储的npm镜像源，如果没有使用默认的npm镜像源
 */
const fs= require('node:fs');
const {homedir} = require('node:os'); // 从 os 模块导入 homedir 函数

// let defaultNpmRegistry = 'https://registry.npmjs.org';
let defaultNpmRegistry = 'https://registry.npmmirror.com/';

try {
	const npmrc = fs.readFileSync(`${homedir()}/.npmrc`, 'utf8'); // 读取用户主目录下的 .npmrc 文件的内容
	const registryLine = npmrc.split('\n').find((line) => line.startsWith('registry=')); // 查找以 "registry=" 开头的行
	if (registryLine) { // 如果找到了这样的行
		defaultNpmRegistry = registryLine.substring(9).trim().replace(/\r$/, '').replace(/\/$/, ''); // 从这行中提取出注册表的 URL，去除其周围的任何空格，并删除任何结尾处的 "\r" 字符（如果有的话）
	}
} catch (err) {
	console.log(`无法读取 ~/.npmrc 文件。${err.message}`); // 如果读取 .npmrc 文件时出现问题，记录错误消息
}


/**
 * 获取镜像源地址
 * @param {{registry: string}} options
 * @returns {*|string}
 */
function getRegistry(options) {
	return options.registry || defaultNpmRegistry;
}

module.exports = {
	getRegistry
};
