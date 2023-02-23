const path = require('path');

module.exports = {
  rollup(config) {
    config.output = {
      ...config.output,
      paths: {
        '@src/*': path.resolve(__dirname, 'src/*'),
      },
    };

    return config;
  },
};