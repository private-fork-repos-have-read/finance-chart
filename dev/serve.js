const ip = require('ip');
const path = require('path');
const serve = require('webpack-serve');
const exampleConfig = require('./webpack.example')();

serve({
  config: path.resolve(__dirname, './webpack.example.js'),
  content: './online',
  host: ip.address(),
});