const path = require('node:path');

/* The callable plugin is `.default`; the object plugin form calls the namespace itself and
   fails with "(intermediate value) is not a function". */
const { default: pandacss } = require('@pandacss/postcss');

module.exports = {
    plugins: [
        pandacss({
            configPath: path.join(__dirname, '../../packages/web-ui/panda.config.ts')
        })
    ]
};
