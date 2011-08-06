var Path = require('path');
require.paths.unshift(Path.join(__dirname, 'lib'));

var Proxy = require('./index');

require('node-color-console');

var input = require('process-input');
if (!input.params.appdir) {
	console.error('Missing app dir path');
	console.info('Use with --appdir=/path/to/app/dir');
	process.exit();
}

var proxy = new Proxy();
proxy.router.setRoot(input.params.appdir);
proxy.listen(input.params.p || 80);
