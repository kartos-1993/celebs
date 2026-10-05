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
    name: 'mobile/money-floats',
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
