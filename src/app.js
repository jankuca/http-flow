var Path = require('path');
var FS = require('fs');

var exec = require('child_process').exec;


/**
 * @constructor
 */
var App = function (info, user) {
	info.hostnames = info.hostnames || [];
	info.maintenance = info.maintenance || [];

	this.info_ = info;
	this.user_ = user;

	this.processCommands_();
	this.processHostnames_();
};

/**
 * Gets PID of the app
 * @param {function (?Error, number)} callback The callback function to which
 *   to pass the PID (or null if the app is not running)
 */
App.prototype.getPID = function (callback) {
	var lsof = exec('lsof | grep LISTEN | grep :' + this.getPort());
	var data = '';
	lsof.stdout.on('data', function (chunk) {
		data += chunk;
	});
	lsof.stderr.on('data', function (chunk) {
		data += chunk;
	});
	lsof.on('exit', function (code) {
		if (code !== 0) {
			return callback(new Error(data.trim()), null);
		}

		var match = data.match(/^\S+\s+(\d+)\s/);
		callback(null, match ? Number(match[1]) : null);
	});
};

/**
 * Restarts the app if it is running
 * @param {function (?Error, boolean)} callback The callback function
 */
App.prototype.restart = function (callback) {
	var self = this;
	this.getPID(function (err, pid) {
		if (err) {
			return callback(err);
		} else if (!pid) {
			return callback(null, false);
		}

		console.info('-- Trying to kill the app ' +
			self.getName() + '/' + self.getVersion());

		var kill = exec('kill ' + pid);
		var data = '';
		kill.stdout.on('data', function (chunk) {
			data += chunk;
		});
		kill.stderr.on('data', function (chunk) {
			data += chunk;
		});
		kill.on('exit', function (code) {
			if (code !== 0) {
				return callback(new Error(data.trim()), null);
			}

			self.start(callback);
		});
	});
};

/**
 * Starts the app
 * @param {function (?Error, boolean)} callback The callback function
 */
App.prototype.start = function (callback) {
	if (!this.command_) {
		return callback(new Error('The app does not provide a start command.'));
	}

	var called = false;
	var proc = exec(this.getStartCommand_());
	console.info('-- Trying to start the app ' +
		this.getName() + '/' + this.getVersion());
	var log = FS.createWriteStream(this.getLogPath(), { encoding: 'utf8', mode: 0775 });
	proc.stdout.on('data', function (chunk) {
		log.write(chunk);
	});
	proc.stderr.on('data', function (chunk) {
		log.write(chunk);
	});
	proc.on('exit', function () {
		if (!called) {
			called = true;
			callback(new Error('The app crashed within 2s from starting up.'), false);
		}
	});
	setTimeout(function () {
		if (!called) {
			called = true;
			callback(null, true);
		}
	}, 2000);
};

App.prototype.getStartCommand_ = function () {
	var command = 'sudo -u ' + this.getUser() + ' ';
	command += this.command_;

	return command;
};

/**
 * Returns the name of the user that should run the app
 * @return {string}
 */
App.prototype.getUser = function () {
	return this.user_;
};

/**
 * Returns the log file path
 * @return {string} The log file path
 */
App.prototype.getLogPath = function () {
	var filename = '.log-' + Math.round(Date.now() / 1000) + '.out';
	return Path.join(this.info_.dirname, filename);
};

/**
 * Processes the commands from the app info and keeps the first relevant one
 */
App.prototype.processCommands_ = function () {
	var commands = this.getFilteredByAppInfo_(this.info_.commands || []);
	this.command_ = commands[0] || null;
};

/**
 * Processes the hostnames from the app info and trashes irrelevant ones
 */
App.prototype.processHostnames_ = function () {
	this.hostnames_ = this.getFilteredByAppInfo_(this.info_.hostnames);
};

/**
 * Returns a subset of the items that match the app info
 * @param {Array.<string|number|Array.<(string|number), Object>} arr
 *   The items to filter
 * @return {Array.<string|number>}
 */
App.prototype.getFilteredByAppInfo_ = function (arr) {
	var info = {
		'dirname': this.info_.dirname,
		'name': this.info_.name,
		'port': this.info_.port,
		'version': this.info_.version
	};

	var result = [];
	arr.forEach(function (item) {
		if (Array.isArray(item)) {
			var rules = item[1];
			var matches = Object.keys(rules).every(function (key) {
				if (rules[key] instanceof RegExp) {
					return rules[key].test(info[key]);
				} else {
					return (rules[key] === info[key]);
				}
			});
			if (!matches) {
				return;
			}
			item = item[0];
		}

		Object.keys(info).forEach(function (key) {
			item = item.replace('{{' + key + '}}', info[key]);
		});
		result.push(item);
	});

	return result;
};

/**
 * Returns a list of hostnames reserved by the app
 * @return {Array.<string>}
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
 * @param {http.ServerRequest} The HTTP request for which to get the page
 * @return {?string} A path to the maintenance page or null if none defined
 */
App.prototype.getMaintenancePage = function (req) {
	var url = req.url;
	var pages = this.info_.maintenance;

	for (var i = 0, ii = pages.length; i < ii; ++i) {
		var page = pages[i];
		if (!Array.isArray(page)) {
			return Path.join(this.info_.dirname, page);
		} else {
			var rx = new RegExp('^\\/' + page[0].replace(/\//g, '\\/') + '\\/');
			if ('/' + page[0] === url || rx.test(url)) {
				return Path.join(this.info_.dirname, page[1]);
			}
		}
	}

	return null;
};


module.exports = App;
