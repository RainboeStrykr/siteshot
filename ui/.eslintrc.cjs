module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  extends: ['eslint:recommended'],
  plugins: ['react-hooks'],
  rules: {
    'no-undef': 'error',
    'no-empty': 'off',
    'no-extra-semi': 'off',
  },
}
