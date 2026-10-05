const base = require('@celebs/eslint-config');

module.exports = [
  ...base,
  {
    name: 'api/type-aware',
    files: ['src/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
      '@typescript-eslint/await-thenable': 'error',

      // Money must not reach a binary float.
      //
      // A double happens to hold a 2-decimal value exactly on the round trip, so
      // this rule looks unnecessary right up until a percentage is involved - and
      // commission is a multiplication. Every hit is a figure a seller is paid
      // from, a customer is charged, or a courier is reconciled against.
      //
      // Deliberately does NOT ban `.toFixed()`. On a Prisma.Decimal it is exact
      // decimal rounding and is the correct way to render a figure in an error
      // message; banning it would flag good code and train everyone to reach for
      // the disable comment. On a float it is a display concern, and the shared
      // formatMoneyAmount exists for that.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.name=/^(parseFloat|Number)$/][callee.arguments.0.type='Identifier'][callee.arguments.0.name=/(price|Price|amount|Amount|total|Total|fee|Fee|subtotal|balance|Balance|cost|Cost|commission|Commission|codFee|weightKg)$/]",
          message:
            'Do not convert money to a float. Keep it a Prisma.Decimal end to end, render with formatMoneyAmount, and use courierWholeRupees at the courier boundary.',
        },
      ],
    },
  },
];
