'use strict';
try {
	// This next line states that we need the Airport.js file included
	var Airport = require(__dirname + '/Airport');
	// This next line states that we need the ConfigFile.js file included
	var ConfigFile = require(__dirname + '/ConfigFile');
	var FlightCategory = require(__dirname + '/FlightCategory');
	// Needed for file system stuff
	var fs = require('fs');
	// Needed because this app hosts a small configuration web site
	var http = require('http').createServer(handler);
	// Needed for the setup screen
	var setup = require(__dirname + '/setup');
	// Needed for the airport list screen
	var home = require(__dirname + '/home');
	// URL and sochet io stuff
	var url = require('url');
	var io = require('socket.io')(http);
	// LED Stuff
	var ws281x = require('/home/pi/node-rpi-ws281x-native/lib/ws281x-native');
	// These are for controlling the LEDS
	var pixelData;
	var blinkData;
	var outData;
	var blinkCycle = false;

	// ---- trap the SIGINT or SIGTERM and reset before exit
	var signals = { 'SIGINT': 2, 'SIGTERM': 15 };
	function shutdown(signal, value) {
		clearInterval(ledUpdateInt);
		clearInterval(aptUpdateInt);
		console.log('Stopped by ' + signal);
		for (var i = 0; i < cf.LEDs; i++) {
			pixelData[i] = 0;
		}
		ws281x.render(pixelData);
		ws281x.reset();
		process.nextTick(function () { process.exit(0); });
	}
	Object.keys(signals).forEach(function (signal) {
		process.on(signal, function () {
			shutdown(signal, signals[signal]);
		});
	});


	// Load up the config file
	var cf = new ConfigFile();
	cf.load(__dirname + '/config.json');

	setupLEDs(cf);
	cf.updateFromWeb(setLEDColors);

	// timed function to update the LEDS
	var ledUpdateInt = setInterval(function () {
		if (blinkCycle) {
			ws281x.render(blinkData);
			blinkCycle = false;
		}
		else {
			ws281x.render(pixelData);
			blinkCycle = true;
		}
	}, 500);

	// timed function to update the airport data every 5 minutes
	var aptUpdateInt = setInterval(function () {
		cf.updateFromWeb(setLEDColors);
	}, 60000 * 5);

	// This function initializes the LEDs for use
	function setupLEDs(cf) {
		pixelData = new Uint32Array(cf.LEDs);
		blinkData = new Uint32Array(cf.LEDs);

		// Initialize the LED Driver
		console.log('Init:' + cf.LEDs);
		ws281x.init(cf.LEDs, { dmaNum: 10 });
	}
	// This function sets the colors of the LEDs per the airport status
	function setLEDColors(cf) {
		// Blank them all out first
		for (var idx = 0; idx < cf.LEDs; idx++) {
			pixelData[idx] = 0;
			blinkData[idx] = 0;
		}
		// Set the ones for the FlightCategories with LED Indexes
		cf.FlightCategories.forEach((el) => {
			if (el.LEDIndex != -1 && el.LEDIndex <= cf.LEDs) {
				var idx = el.LEDIndex - 1; // LEDs really start at 0 so subtract 1
				switch (el.Name) {
					case 'VFR':
						pixelData[idx] = 0xff0000;
						blinkData[idx] = 0xff0000;
						break;
					case 'MVFR':
						pixelData[idx] = 0x0000ff;
						blinkData[idx] = 0x0000ff;
						break;
					case 'IFR':
						pixelData[idx] = 0x00FF00;
						blinkData[idx] = 0x00FF00;
						break;
					case 'LIFR':
						pixelData[idx] = 0x00ffff;
						blinkData[idx] = 0x00ffff;
						break;
				}
			}
		});
		// Just set the ones for the airports with LEDIndexes
		cf.Airports.forEach((el) => {
			if (el.LEDIndex != -1 && el.LEDIndex <= cf.LEDs) {
				var idx = el.LEDIndex - 1; // LEDs really start at 0 so subtract 1
				pixelData[idx] = (el.LEDColor == null) ? 0 : el.LEDColor;
				blinkData[idx] = (el.WindSpeed == null) ? el.LEDColor : (el.WindSpeed < cf.WindSpeed) ? el.LEDColor : 0;
				//// Override the blink mask to YELLOW if Maintenance mask is true
				//if (el.MaintenanceCheck == true) {
				//	blinkData[idx] = 0xffff00;  // This should be yellow
				//}
			}
		});
	}

	// Create the 'web server' handler
	function handler(req, res) {
		try {
			//var path = url.parse(req.url).pathname.toLowerCase();
			var path = req.url;
			//		var fn = __dirname + '\\html' + path.replace('/','\\');  // For DOS based
			if (path == '/') {
				path = '/home.html';
			}
			var fn = __dirname + '/html' + path;
			console.log('Path:' + path);
			fs.readFile(fn, function (err, data) {
				if (err) {
					res.writeHead(404);
					res.write('err');
				}
				else {
					var outData = '';
					switch (path) {
						case '/setup.html':
							outData = new setup().doIt(data, req, res, cf);
							break;
						case '/home.html':
							outData = new home().doIt(data, req, res, cf);
							break;
					}
					res.writeHead(200, { 'Content-Type': 'text/html' });
					res.write(outData);
					console.log('write out html');
				}
				res.end();
				console.log('end');
			});
		}
		catch (error) {
			console.log(error);
			res.writeHead(404);
			res.write('Something wrong happened!');
			res.end();
		}
	}
	http.listen(8080);

	// This section is for all the call back stuff from the web pages
	io.sockets.on('connection', function (socket) {
		// This will set the selected LED to flash
		socket.on('FLASHLED', function (id) {
			console.log('FLASHLED:' + id.toString());
			for (var l = 0; l < cf.LEDs; l++) {
				pixelData[l] = (l == id - 1) ? 0xffffff : 0x000000;
				blinkData[l] = 0;
			}
		})
		// This will save the config file
		socket.on('SAVE', function (saveString) {
			console.log('SAVING:' + saveString);
  		cf.loadFromJSON(JSON.parse(saveString));
			try {
				cf.save(__dirname + '/config.json');
				setupLEDs(cf);
				cf.updateFromWeb(setLEDColors);
			}
			catch (ex) {
				console.log(ex);
			}
		})
		// This will update the LED count
		socket.on('LEDCOUNT', function (leds) {
			console.log('LEDCOUNT:' + leds);
			cf.LEDs = leds;
			cf.Airports.forEach((el) => {
				el.LEDIndex = -1;
			});
			cf.save(__dirname + '/config.json');
			ws281x.reset();
			setupLEDs(cf);
			cf.updateFromWeb(setLEDColors);
		})
		// This will update the Airport list
		socket.on('NEWAPTS', function (aptsString) {
			console.log('NEWAPTS:' + aptsString);
			var apts = aptsString.split(',');
			cf.Airports = [];
			apts.forEach((el) => {
				var a = new Airport();
				a.LEDIndex = -1;
				a.Name = el.trim().toUpperCase();
				cf.Airports.push(a);
			});

			cf.save(__dirname + '/config.json');
		})
		socket.on('REFRESHSTATUS', function () {
			console.log('REFRESHSTATUS');
			cf.updateFromWeb(setLEDColors);
		})
	});
	
	// Function to handle the lights screen
	function doLights(data, req, res) {
		return data;
	}
}
catch (ex) {
	console.log(ex);
}