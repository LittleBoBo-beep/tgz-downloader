class Utils {
    // 这里用来判断依赖的类型
    static checkDependencyType(packageString) {
        return packageString.startsWith('npm:')
    }
    // 用来获取依赖包名称
    static getPackageName(packageString = '') {
        // 定义正则表达式来匹配包名部分
        const regex = /npm:(.*)@/;
        const match = packageString.match(regex);
        if (match && match.length > 1) {
            const packageName = match[1];
            console.log(packageName); // 输出包名 "package-name"
            return packageName;
        } else {
            console.log("No package name found");
            return null;
        }
    }
    static isURL(str) {
        // URL正则表达式
        const urlPattern = /^(ftp|http|https):\/\/[^ "]+$/;

        // 使用正则表达式进行匹配
        return urlPattern.test(str);
    }
}

module.exports = Utils;
