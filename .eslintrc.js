module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'jsdoc'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:jsdoc/recommended'
  ],
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 2022,
    sourceType: 'module',
    tsconfigRootDir: __dirname
  },
  rules: {
    "jsdoc/require-param-type": "off",
    "jsdoc/require-returns-type": "off",
    'jsdoc/require-returns': [
      'error',
      {
        'checkGetters': true,
        'forceReturnsWithAsync': false,
        'checkConstructors': false,
      },
    ],
    'accessor-pairs': [
      'error',
      {
        setWithoutGet: true,
        getWithoutSet: false,
        enforceForClassMembers: true,
      },
    ],
    'no-multiple-empty-lines': ['error', { 'max': 2, 'maxBOF': 0, 'maxEOF': 0 }]
  },
};
