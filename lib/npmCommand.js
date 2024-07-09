const exec = require('node:child_process').exec;
const path = require('node:path')
class NpmCommand {
    static generatorPackageLock(cwd, timeout = 1000 * 60 * 2) {
        return new Promise((resolve, reject) => {
            exec('npm install --package-lock-only', {cwd: path.dirname(cwd), timeout, encoding: 'utf-8'}, (err, stdout, stderr) => {
                if (err) {
                    return reject(err);
                }
                return resolve(stdout)
            });
        })
    }
}


module.exports = NpmCommand
