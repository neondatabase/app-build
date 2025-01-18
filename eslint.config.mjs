import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.config({
    extends: ['next/core-web-vitals', 'next/typescript'],
    plugins: ['unicorn'],
    rules: {
      'unicorn/template-indent': [
        'warn',
        {
          tags: [],
          functions: [],
          selectors: ['TemplateLiteral'],
        },
      ],
    },
  }),
];

export default eslintConfig;
