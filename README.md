# tgz-package-downloader

## 简介

tgz-package-downloader，可将js项目中使用到的依赖包(dependence， devDependence， peerDependence)
的所有的镜像tgz文件与package.json文件根据目录路径下载保存到你的电脑上。

## 背景

由于公司内网开发的限制，所有的项目都需转移到内网开发， 由此内网就需要搭建一个npm私服，tgz-package-downloader就是为了能够快速稳定下载tarballs

## 安装

> npm install tgz-package-downloader -g

## 使用
**通过本地package-json文件下载包**
> download-tgz package-json path/package.json
> 
**通过远程package-json文件下载包**
> download-tgz package-json https://

**通过想要下载的包名下载包，可以把该包以及该包的底层以来全部下载出来**
> download-tgz package packageName version

**（推荐）通过package-lock文件下载包，由于该文件包含了所有下载包的信息，通过这个路径下载包可以加快下载速度以及能够不丢包的情况下下载完成**
> download-tgz package-lock path/package.lock

> download-tgz.js 
## 功能

下载tgz包到你的电脑，基于以下信息

1. download-tgz package name（包名）
2. download-tgz package-json (本地文件/线上文件)
3. download-tgz package-lock-json (本地文件/线上文件)


## 参考

