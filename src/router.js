var FS = require('fs');
var Path = require('path');
var App = require('./app.js');


/**
 * @constructor
 */
var Router = function () {
	this.root_ = null;
};

/**
 * Sets the root directory path
 * @param {string} path The root directory path
 */
Router.prototype.setRoot = function (path) {
	this.root_ = Path.resolve(process.cwd(), path);
};

/**
 * Starts the router
 */
Router.prototype.run = function () {
	this.update_();
};

/**
 * Creates apps from an application directory
 */
Router.prototype.update_ = function () {
	this.apps_ = [];

	var self = this;
	var root = this.root_;
	FS.readdir(root, function (err, names) {
		if (!err) {
			if (names.length === 0) {
				console.warn('-- No apps found');
				return;
			}

			var dirnames = names.map(function (name) {
				return Path.join(root, name);
			});
			dirnames.forEach(self.registerAppDirectory_, self);
		}
	});
};

/**
 * Creates apps from an application directory
 * @param {string} dirname The application directory path
 */
Router.prototype.registerAppDirectory_ = function (dirname) {
	var self = this;
	var name = Path.basename(dirname);
	var ports = this.getPortNumbersForAppDirectory(dirname);
	FS.readdir(dirname, function (err, versions) {
		if (!err) {
			if (versions.indexOf('.git') === -1) {
				if (versions.length === 0) {
					console.warn('-- No versions found for the app ' + name);
					return;
				}

				versions.forEach(function (version) {
					var port = Number(ports[version]);
					if (port) {
						self.registerAppVersionDirectory_(dirname, version, port);
					}
				});
			}
		}
	});
};

/**
 * Creates an app from an app version directory
 *  if it includes a proxyinfo file (read synchronously).
 * @param {string} dirname The version directory path
 * @param {number} port The port on which the app should listen
 */
Router.prototype.registerAppVersionDirectory_ = function (app_dirname, version, port) {
	var dirname = version ? Path.join(app_dirname, version) : app_dirname;
	var info_path = Path.join(dirname, '.proxyinfo.json');
	try {
		var info = JSON.parse(FS.readFileSync(info_path, 'utf8'));
		info.port = port;
		info.dirname = dirname;
		info.name = Path.basename(Path.resolve(dirname, '..'));
		info.version = version;
		var app = new App(info);
		this.apps_.push(app);
		console.info('-- App registered: ' + info.name + '/' + info.version + ' -> ' + port +
			"\n   Hostnames: " + (app.getHostnames().join("\n              ") || '[none]'));
	} catch (err) {}
};

/**
 * Synchronously (!) reads the port file and returns a map of ports
 *   for versions (branches) of the given application
 * @param {string} name The application directory name (not path!)
 * @return {!Object}
 */
Router.prototype.getPortNumbersForAppDirectory = function (dirname) {
	try {
		var path = Path.join(dirname, '.ports.json');
		var data = JSON.parse(FS.readFileSync(path, 'utf8'));
		return data.ports || {};
	} catch (err) {
		return {};
	}
};

/**
 * Returns the app that reserved the given hostname if there is one
 * @param {string} hostname The hostname
 * @return {App}
 */
Router.prototype.getAppByHostname = function (hostname) {
	hostname = this.normalizeHostname_(hostname);

	var apps = this.apps_;
	for (var i = 0, ii = apps.length; i < ii; ++i) {
		if (apps[i].getHostnames().indexOf(hostname) !== -1) {
			return apps[i];
		}
	}

	return null;
};

/**
 * Normalizes the given hostname to include at least 3 domain levels
 *   and no port number
 * @param {string} The hostname to normalize
 * @return {string} The normalized hostname
 */
Router.prototype.normalizeHostname_ = function (hostname) {
	hostname = hostname.split(':')[0];
	var parts = hostname.split(/\./);
	return parts.length > 2 ? hostname : 'www.' + hostname;
};


module.exports = Router;
