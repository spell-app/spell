var path = require('path');

export const paths = {
	root:	__dirname,
	src:	path.join(__dirname, "src"),
	build:	path.join(__dirname, "build")
};

export default {
	entry: './src/index.js',

	output: {
		path: paths.build,
		filename: "[name].js",
		publicPath: "/"
	},


	module: {
	  rules: [
		{ test: /\.jsx?$/, exclude: /node_modules/, loader: "babel-loader" }
	  ]
	}
};
