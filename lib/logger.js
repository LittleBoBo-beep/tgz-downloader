/**
 * 封装log方法
 * @param metaValues
 * @param details
 */
function log(metaValues = [], ...details) {
  if(log.ignore) return;
  
  const meta = metaValues.reduce((memo, value) => `${memo}[${value}]`, '');
  console.log(meta, ...details);
}
// 通过变量是否忽略打印的console日志信息
log.ignore = false;

module.exports = log;