var path = require('path');

var paths = {
	root:	__dirname,
	src:	path.join(__dirname, "src"),
	build:	path.join(__dirname, "build")
};

module.exports = {
	entry: {
		"parser": "./src/index.js",
		"app": "./src/app/index.jsx"
	},

	output: {
		path: paths.build,
		filename: "[name].js",
		publicPath: "/"
	},

	devtool: "inline-source-map", //"cheap-module-eval-source-map",

	module: {
	  rules: [
		{ test: /\.jsx?$/, exclude: /node_modules/, loader: "babel-loader" }
	  ]
	}
};
