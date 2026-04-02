const path = require('path')

const production = process.env.NODE_ENV === 'production'

module.exports = {
  mode: production ? 'production' : 'development',
  context: path.join(__dirname, '/src'),
  entry: './index.js',
  output: {
    path: path.join(__dirname, '/dist'),
    filename: 'bundle.js',
    publicPath: '/'
  },
  module: {
    rules: [
      {
        test: /\.worklet\.js$/,
        type: 'asset/resource',
        generator: {
          filename: '[name][ext]'
        }
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: 'defaults'
              }]
            ]
          }
        }
      },
      {
        test: /\.(vert|frag)$/,
        loader: 'webpack-glsl-loader'
      }
    ]
  },
  devtool: production ? 'source-map' : 'eval-source-map',
  devServer: {
    static: {
      directory: path.join(__dirname, '/src')
    },
    hot: true,
    port: 8080
  }
}

