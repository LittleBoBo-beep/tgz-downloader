const log4js = require('log4js');
const date = new Date();
const filename = `./${date.getFullYear()} ${date.getMonth() + 1} ${date.getDate()} ${date.getHours() < 10 ? '0' + date.getHours() : date.getHours()}-${date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()}-${date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds()}`

log4js.configure({
    appenders: {
        // 配置一个 default 对象, type代表输出文件类型 filename代表输出文件名
        default: { type: 'file', filename: filename + '.debug.log' },
        // 配置了一个 cheese 对象 type代表输出文件类型 filename代表输出文件名
         error: { type: 'file', filename: filename + '.error.log' },
    },
    categories: {
        // 默认 default 分类, 触发 debug 级别日志时会使用 default 对象处理
        default: { appenders: ['default'], level: 'debug' },
        // 自定义一个 cheese 分类, 触发 error 级别日志时会使用 cheese 和 debug 对象处理
        error: { appenders: ['error'], level: 'error' }
    }
})

const logger = log4js.getLogger() // 获得日志对象
const errorLogger = log4js.getLogger('error') // 获得日志对象
// logger.debug('只会使用 categories 对象中的 default 对象的配置处理该日志')
// logger.error('使用 categories 对象中的 cheese 对象的配置来处理该日志')
function errorLog(message) {
    errorLogger.error(message);
}

function debugLog(message) {
    logger.debug(message);
}

module.exports = {
    debugLog,
    errorLog
}
