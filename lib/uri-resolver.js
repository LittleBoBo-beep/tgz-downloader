const fs = require('fs');
const axios = require('axios');
/**
 * 通过uri地址获取package或package-lock文件
 * @param {string} uri
 * @return {object}
 */
function retrieveFile (uri) {
    if (fs.existsSync(uri)) {
        return JSON.parse(fs.readFileSync(uri, 'utf8'));
    }
    return axios.get(uri, { responseType: 'json'}).then(res => res.data).catch(err => new Error(`Could not retrieve file ${err.message.red}`))
}

module.exports = {retrieveFile};
