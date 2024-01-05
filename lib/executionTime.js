// 执行时间开始时间
const start = Date.now();
process.on('unhandledRejection', error => {
    console.log(`[${'unhandledRejection'.red}]: ${error.message}`, error);
})
// 退出程序，计算执行时间
process.on('beforeExit', () => {
    console.log(`completed in ${Date.now() - start}ms`.green);
});
