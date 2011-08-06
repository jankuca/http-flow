var Path = require('path');
var FS = require('path');


/**
 * @constructor
 */
var App = function (info) {
	info.hostnames = info.hostnames || [];
	info.maintenance = info.maintenance || [];

	this.info_ = info;

	this.processHostnames_();
};

/**
 * Processes the hostnames from the app info and trashes irrelevant ones
 */
App.prototype.processHostnames_ = function () {
	var hostnames = [];
	this.hostnames_ = hostnames;

	var data = {
		'version': this.info_.version
	};

	this.info_.hostnames.forEach(function (pattern) {
		if (Array.isArray(pattern)) {
			var rules = pattern[1];
			var matches = Object.keys(rules).every(function (key) {
				if (rules[key] instanceof RegExp) {
					return rules[key].test(data[key]);
				} else {
					return (rules[key] === data[key]);
				}
			});
			pattern = pattern[0];
			if (!matches) {
				return;
			}
		}

		Object.keys(data).forEach(function (key) {
			pattern = pattern.replace('{{' + key + '}}', data[key]);
		});
		hostnames.push(pattern);
	});
};

/**
 * Returns a list of hostnames reserved by the app
 * @return {!Array.<string>}
 */
App.prototype.getHostnames = function () {
	return this.hostnames_.concat();
};

/**
 * Returns the port on which the app listens
 * @return {number}
 */
App.prototype.getPort = function () {
	return this.info_.port;
};

/**
 * Returns the application name
 * @return {string}
 */
App.prototype.getName = function () {
	return this.info_.name;
};

/**
 * Returns the application name
 * @return {string}
 */
App.prototype.getVersion = function () {
	return this.info_.version;
};

/**
 * Returns a maintenance page path if there is such page defined
 */
App.prototype.getMaintenancePage = function (req) {
	var url = req.url;
	var pages = this.info_.maintenance;

	for (var i = 0, ii = pages.length; i < ii; ++i) {
		var page = pages[i];
		if (!Array.isArray(page)) {
			return Path.join(this.dirname_, page);
		} else {
			var rx = new RegExp('^\\/' + page[0].replace(/\//g, '\\/') + '\\/');
			if ('/' + page[0] === url || rx.test(url)) {
				return Path.join(this.dirname_, page[1]);
			}
		}
	}

	return null;
};


module.exports = App;
