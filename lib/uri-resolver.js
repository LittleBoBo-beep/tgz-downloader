// const path = require('path');
const fs = require('fs');
const axios = require('axios');

/**
 * 通过uri地址获取package或package-lock文件
 * @param {string} uri
 * @returns {Promise<axios.AxiosResponse<any>>|string}
 */
async function retrieveFile (uri) {
    if (fs.existsSync(uri)) {
        return JSON.parse(fs.readFileSync(uri, 'utf8'));
    }
    try {
        const response = await axios.get(uri, { responseType: 'json'})
        return response.data;
    } catch (e) {
        throw new Error(`Could not retrieve file ${e.message.red}`);
    }
}

module.exports = {retrieveFile};