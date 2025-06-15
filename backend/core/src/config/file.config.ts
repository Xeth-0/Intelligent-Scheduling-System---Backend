import * as path from 'path';

const isProduction = process.env.NODE_ENV === 'production';

export const fileConfig = {
  templates: {
    path: path.resolve(
      process.cwd(),
      isProduction
        ? 'dist/modules/file/templates'
        : 'src/modules/file/templates',
    ),
  },
};
