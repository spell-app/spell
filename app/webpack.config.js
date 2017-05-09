var path = require('path');
var webpack = require("webpack");

var paths = {
	root:	__dirname,
	src:	path.join(__dirname, "src"),
	build:	path.join(__dirname, "build")
};

module.exports = {
	entry: {
		"app": "./src/app/index.jsx",
		"vendor": ["react", "react-dom", "semantic-ui-react", ]
	},

	output: {
		path: paths.build,
		filename: "[name].js",
		publicPath: "/"
	},

	plugins: [
		new webpack.optimize.CommonsChunkPlugin("vendor")
	],

	devtool: "inline-source-map", //"cheap-module-eval-source-map",

	module: {
	  rules: [
		{ test: /\.jsx?$/, exclude: /node_modules/, loader: "babel-loader" },
        { test: /\.css$/, loader: "style-loader!css-loader" },
        { test: /\.less$/, loader: "style-loader!css-loader!less-loader" }
	  ]
	}
};
