#!/usr/bin/env node
const {program} = require('commander'); // 解析指令库
const packageJson = require('../package.json'); // 获取packageJson文件
const os = require('node:os'); // 操作系统
const commands = require('../lib/commands'); // 执行输入指令
const CPUCore = os.cpus().length; // 获取CPU内核数量
require('colors'); // 引入字体颜色
require('../lib/executionTime') // 计算执行时间

program.version(packageJson.version);

// 通过package-lock文件下载对应的包与版本的package-lock文件
program
    .command('package-lock <uri>')
    .description('download tarballs based on a package-lock.json')
    .option('--directory [directory]', 'Download path, the default path is the current path with tarballs', './tarballs')
    .option('--registry [registry]', 'Source address of the image to be downloaded', 'https://registry.npmjs.org')
    .option('-c, --concurrency <concurrency>', 'number of concurrent download', commands.parseConcurrency, CPUCore)
    .action((uri, command) => commands.packageLockCommand(uri, command));
// 通过指定包与版本号下载tarballs
program
    .command('package <name> [version]')
    .description('download tarballs based on a package and a version')
    .option('--directory [directory]', 'Download path, the default path is the current path with tarballs', './tarballs')
    .option('--registry [registry]', 'Source address of the image to be downloaded', 'https://registry.npmjs.org')
    .option('--devDependencies', 'download devDependencies', false)
    .option('--peerDependencies', 'download peerDependencies', false)
    .option('-c, --concurrency <concurrency>', 'number of concurrent download', commands.parseConcurrency, CPUCore)
    .action((name, version, command) => commands.packageCommand(name, version, command));
// 通过指定包名与版本数量，从倒数的版本开始计数进行下载。
program
    .command('packages <name> [version-number]')
    .description('download tarballs based on a package and number of versions')
    .option('-DIR, --directory [directory]', 'Download path, the default path is the current path with tarballs', './tarballs')
    .option('-R, --registry [registry]', 'Source address of the image to be downloaded', 'https://registry.npmjs.org')
    .option('-DEV, --devDependencies', 'download devDependencies', false)
    .option('-PEER, --peerDependencies', 'download peerDependencies', true)
    .option('-C, --concurrency <concurrency>', 'number of concurrent download', commands.parseConcurrency, CPUCore)
    .action((name, version, command) => commands.packagesCommand(name, version, command));

// 通过package.json来生成tarballs包
program
    .command('package-json <uri>')
    .description('download tarballs based on a package.json')
    .option('--directory [directory]', 'Download path, the default path is the current path with tarballs', './tarballs')
    .option('--registry [registry]', 'Source address of the image to be downloaded', 'https://registry.npmjs.org')
    .option('--devDependencies', 'download devDependencies', false)
    .option('--peerDependencies', 'download peerDependencies', true)
    .option('-c, --concurrency <concurrency>', 'number of concurrent download', commands.parseConcurrency, CPUCore)
    .action((uri, command) => commands.packageJsonCommand(uri, command));
// 搜索指定的tgz的包
program
    .command('search <keyword>')
    .description('request packageJson file show in Bash window')
    // .option('--directory [directory]', 'default path is current path plus tar file', './tar')
    .option('--registry [registry]', 'Source address of the image to be downloaded', 'https://registry.npmjs.org')
    .action((keyword, command) => commands.searchCommand(keyword, command));
// 搜索指定包的版本数量和版本信息
// program
//     .command('search-version <keyword>')
//     .description('download tarballs based on a npm registry search results')
//     .option('--directory [directory]', 'default path is current path plus tar file', './tar')
//     .option('--registry [registry]', 'Source address of the image to be downloaded', 'https://registry.npmjs.org')
//     .action((keyword, command) => commands.searchCommand(keyword, command));
// 生成一份检索包的依赖文件列表，同时也包含依赖包中的依赖
// program
// 	.command('generate-dependency <keyword>')
// 	.description('generate dependencies list file named list based on a package')
// 	.option('--outputFile [outputFile]', 'default path is current path plus list file', './list.json')
// 	.option('--registry [registry]', 'Source address of the image to be downloaded', 'https://registry.npmjs.org')
// 	.option('--devDependencies', 'has devDependencies', true)
// 	.option('--peerDependencies', 'has peerDependencies', true)
// 	.option('--deep', 'Dependencies in a dependency package', false)
// 	.action((keyword, command) => commands.generateCommand(keyword, command))
// program
//     .command('generate <name> [version]')
//     .description('generates the download links for a giving package and a version')
//     .option('--outputFile [outputFile]', 'default path is current path plus tar file', './tar')
//     	.option('--registry [registry]', 'Source address of the image to be downloaded', 'https://registry.npmjs.org')
// .option('--devDependencies', 'download devDependencies', false)
// .option('--peerDependencies', 'download peerDependencies', false)
//     .action((name, version, command) => commands.generateCommand(name, version, command));

// program
//     .command('from-generated <uri>')
//     .description('download tarballs using a generated file created by the generate command')
//     .option('--directory [directory]', 'Download path, the default path is the current path with tarballs', './tarballs')
//     .action((uri, command) => commands.fromGeneratedCommand(uri, command));

program.parse(process.argv);
