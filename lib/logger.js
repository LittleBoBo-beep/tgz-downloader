/**
 * 封装log方法
 * @param metaValues
 * @param details
 */
const { errorLog, debugLog } = require('./log.js');
function log(logType, metaValues = [], ...details) {
  if(log.ignore) return;
  
  const meta = metaValues.reduce((memo, value) => {
    return `${memo}[${value}]`
  }, '');
  console.log(meta, ...details);
  if (logType === 'debug') {
    debugLog(typeof details === 'object' ? JSON.stringify(details): details);
  } else if (logType === 'error') {
    errorLog(typeof details === 'object' ? JSON.stringify(details): details);
  }
}
// 通过变量是否忽略打印的console日志信息
log.ignore = false;

module.exports = log;