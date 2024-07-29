# tgz-package-downloader

## 简介

`tgz-package-downloader` 是一个能够将 JavaScript 项目中使用的依赖包（包括 dependencies、devDependencies 和 peerDependencies）的所有镜像 tgz 文件和 `package.json` 文件下载保存到本地的工具。

## 安装

```bash
npm install tgz-package-downloader -g
```

## 使用方法

### 通过本地 `package.json` 文件下载包

```bash
download-tgz package-json path/to/package.json
```

### 通过远程 `package.json` 文件下载包

```bash
download-tgz package-json https://example.com/path/package.json
```

### 通过包名和版本下载包（包括该包的所有底层依赖）

```bash
download-tgz package packageName version
```

### 通过 `package-lock.json` 文件下载包（推荐）

由于 `package-lock.json` 文件包含了所有依赖包的信息，这种方式速度更快且不易丢包：

```bash
download-tgz package-lock path/to/package-lock.json
```

### 通过 `packages` 命令批量下载 npm 包

可以下载指定数量的不同版本：

```bash
download-tgz packages packageName versionNumber
```

## 注意事项

1. **网络依赖**：下载 tgz 包需要网络连接，下载速度取决于你的网络速度。
2. **磁盘空间**：下载过程会消耗磁盘空间，完成后请注意清理不需要的文件。
3. **检查错误日志**：下载完成后请参照生成的 `error.log` 文件，查看是否有未下载成功的文件，必要时重新执行命令下载。
4. **内网开发测试（推荐）**：在将包导入内网开发环境前，建议使用 [Verdaccio](https://verdaccio.org/) 进行测试，防止版本不兼容的问题。注意某些包可能包含二进制文件，可能会导致下载失败。
5. **保留锁文件**：如果是根据 `package-lock.json` 或 `package.json` 文件进行下载，请保留生成的 `package-lock.json` 文件以备后续使用。

## 功能

`tgz-package-downloader` 可以下载 tgz 包到本地，基于以下信息：

1. 通过包名和版本下载：`download-tgz package packageName version`
2. 通过本地或远程的 `package.json` 文件下载：`download-tgz package-json (path/to/package.json 或 https://example.com/path/package.json)`
3. 通过本地或远程的 `package-lock.json` 文件下载：`download-tgz package-lock (path/to/package-lock.json 或 https://example.com/path/package.json)`

## 参考

[node-tgz-downloader](https://www.npmjs.com/package/node-tgz-downloader)

`tgz-package-downloader` 基于 [node-tgz-downloader](https://www.npmjs.com/package/node-tgz-downloader)，进行了优化以满足更多使用场景和需求。