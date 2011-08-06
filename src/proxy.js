var FS = require('fs');
var HTTP = require('http');
var Path = require('path');
var Router = require('./router.js');

var log = require('util').log;


/**
 * @constructor
 */
var Proxy = function () {
	this.router = new Router();
};

/**
 * Starts the HTTP server
 * @param {number} port The port on which to listen
 */
Proxy.prototype.listen = function (port) {
	this.port = port || 80;

	var self = this;
	var server = HTTP.createServer(function (req, res) {
		self.handleRequest_(req, res);
	});
	server.listen(port);
	console.info('== The proxy is listening on port ' + port + '.');

	this.router.run();
};

/**
 * Handles an HTTP request
 * @param {!http.ServerRequest} req The HTTP request
 * @param {!http.ServerResponse} res The HTTP response to the request
 */
Proxy.prototype.handleRequest_ = function (req, res) {
	var app = this.router.getAppByHostname(req.headers.host);
	var url = 'http://' + req.headers.host + req.url;
	if (!app) {
		log(req.method + ' ' + url + ' -> [no route]');
		res.writeHead(404);
		res.end();
	} else {
		log(req.method + ' ' + url + ' -> ' + app.getName() + '/' + app.getVersion());
		this.proxyToApp_(req, res, app);
	}
};

/**
 * Passes the request to the app
 * @param {!http.ServerRequest} req The HTTP request to pass
 * @param {!http.ServerResponse} res The HTTP response to the request
 * @param {!App} app The app to which to pass the request
 */
Proxy.prototype.proxyToApp_ = function (req, res, app) {
	var params = this.getProxyRequestParams_(req, app);
	var request = HTTP.request(params, this.createProxyResponsePipe_(res));
	req.pipe(request);
	req.on('end', function () {
		request.end();
	});

	var self = this;
	request.on('error', function (err) {
		res.writeHead(503);

		var maintenance = app.getMaintenancePage(req);
		if (maintenance) {
			self.respondWithStaticFile_(maintenance, res);
		} else {
			res.end();
		}
	});
};

/**
 * Response pipe factory
 * The returned function should be used as the second argument of http.request.
 * @param {!http.ServerResponse} res The response to which to pipe
 * @return {function(!http.ServerResponse)}
 */
Proxy.prototype.createProxyResponsePipe_ = function (res) {
	return function (response) {
		res.writeHead(response.statusCode, response.headers);
		response.on('data', function (chunk) {
			res.write(chunk);
		});
		response.on('end', function () {
			res.end();
		});
	};
};

/**
 * Returns a map of params to be used for the proxy request
 * @param {!http.ServerRequest} req The original HTTP request
 * @param {!App} app The app to which will be the request proxied
 * @return {!Object} A map of params
 */
Proxy.prototype.getProxyRequestParams_ = function (req, app) {
	return {
		method: req.method,
		host: '127.0.0.1',
		port: app.getPort(),
		path: req.url,
		headers: this.getRequestHeaders_(req)
	};
};

/**
 * Returns a map of headers to be used for the proxy request
 * @param {!http.ServerRequest} req The original HTTP request
 * @return {!Object} A map of headers
 */
Proxy.prototype.getRequestHeaders_ = function (req) {
	var headers = req.headers;
	headers['x-forwarded-for'] = req.connection.remoteAddress;

	return headers;
};

/**
 * Writes file contents to the response stream and closes the request
 * @param {string} path A file path
 * @param {!http.ServerResponse} res The HTTP response to which to write
 */
Proxy.prototype.respondWithStaticFile_ = function (path, res) {
	Path.exists(path, function (exists) {
		if (exists) {
			FS.readFile(path, 'binary', function (err, contents) {
				res.write(contents, 'binary');
				res.end();
			});
		} else {
			res.end();
		}
	});
};


module.exports = Proxy;
