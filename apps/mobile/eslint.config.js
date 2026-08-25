const expo = require('eslint-config-expo/flat');

module.exports = [
  ...expo,
  {
    ignores: ['.expo/*', 'android/**', 'node_modules/*'],
  },
];
