# tgz-package-downloader

## 简介

tgz-package-downloader，可将js项目中使用到的依赖包(dependence， devDependence， peerDependence)
的所有的镜像tgz文件与package.json文件根据目录路径下载保存到你的电脑上。

## 背景

由于公司内网开发的限制，所有的项目都需转移到内网开发， 由此内网就需要搭建一个npm私服，tgz-package-downloader就是为了能够快速稳定下载tarballs

## 安装

> npm install tgz-package-downloader -g

## 使用
> download-tgz.js package-json path/package.json

> download-tgz.js package-json https://

> download-tgz.js package packageName version

> download-tgz.js package-lock path/package.lock

> download-tgz.js 
## 功能

下载tgz包到你的电脑，基于一下信息

1. package name（包名）
2. package-json (本地文件/线上文件)
3. package-lock-json (本地文件/线上文件)