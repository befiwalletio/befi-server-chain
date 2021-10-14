
class Convert {

    async assertParams(params, keys = []) {
        for (let key of keys) {
            if (!params[key]) {
                await this.error(801);
                break
            }
        }
    }

    error(code = 20001,message,language='en') {
        throw new NetException(code,message,language);
    }
}

module.exports = Convert;