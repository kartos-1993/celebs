const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = (config, context) => {
  config.plugins = config.plugins || [];
  
  config.plugins.push(
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
    })
  );

  config.output = {
    ...config.output,
    path: join(__dirname, '../../dist/apps/api'), // Note: fixed from 'auth' to 'api'
  };

  config.externals = [
    ...(config.externals || []),
    ({ request }, callback) => {
      if (request && (request.includes('generated/prisma') || request.includes('generated\\prisma'))) {
        return callback(null, 'commonjs ./generated/prisma');
      }
      callback();
    }
  ];

  return config;
};
