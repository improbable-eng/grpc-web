import typescript from 'rollup-plugin-typescript2';
import pkg from './package.json'

export default {
  input: "src/index.ts",
  output: [{
      file: pkg.module,
      format: 'es',
    },
    {
      file: pkg.main,
      format: 'cjs',
    },
    {
      name: pkg.name,
      file: pkg.browser,
      format: 'umd',
      globals: [],
    }
  ],
  plugins: [
    typescript({
      typescript: require('typescript'),
    })
  ],
  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
    // Suppress warnings for modules that will not be included in the bundle
    'http', 'https', 'url', 'browser-headers',
  ],
}
