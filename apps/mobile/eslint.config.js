const expo = require('eslint-config-expo/flat');

module.exports = [
  ...expo,
  {
    ignores: ['.expo/*', 'android/**', 'node_modules/*'],
  },
  {
    rules: {
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];
