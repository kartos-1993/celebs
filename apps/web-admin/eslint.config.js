import pluginQuery from '@tanstack/eslint-plugin-query';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

import base from '@celebs/eslint-config';

export default [
  ...base,
  ...pluginQuery.configs['flat/recommended'],
  {
    ignores: ['dist', 'src/components/ui'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'no-console': 'error',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    // Money must not reach a binary float.
    //
    // A double happens to hold a 2-decimal value exactly on the round trip, so
    // this looks unnecessary right up until a percentage is involved. Every hit is
    // a figure a shopper is shown or a seller is paid from. Use moneyAdd,
    // moneyMultiply, moneyPercentOf, compareMoney and formatMoneyAmount from
    // shared-utils instead.
    //
    // Does not ban .toFixed: it is exact on a Decimal and only a display concern
    // on a float, and formatMoneyAmount covers rendering.
    name: 'web-admin/money-floats',
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.name=/^(parseFloat|Number)$/][callee.arguments.0.type='Identifier'][callee.arguments.0.name=/(price|Price|amount|Amount|total|Total|fee|Fee|subtotal|balance|Balance|cost|Cost|commission|Commission|codFee)$/]",
          message:
            'Do not convert money to a float. Use the money helpers in @celebs/shared-utils and render with formatMoneyAmount.',
        },
      ],
    },
  },
];
