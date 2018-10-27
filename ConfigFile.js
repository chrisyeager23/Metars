var Airport = require('./Airport');          // Needed because a ConfigFile consists of Airport objects
var fs = require('fs');                      // Needed for file IO (saving and loading the ConfigFile)
var http = require('http');                  // Needed to gather weather information from the gov site
var https = require('https');                // Needed to gather weather information from the gov site

// This is a list of the properties to save in the 'stringification' of this
// ConfigFile object.  It includes all the properties of this class and the
// Airport class that are to be persisted.
const propsToSave = ['LEDs', 'WindSpeed', 'Airports', 'Name', 'LEDIndex'];

const metarRegex = [/(\d+)SM/, /SKC|CLR|NSC|((FEW|SCT|BKN|OVC)(\d{3}))/, /(.+?)KT/];

// Here is the URL to get the RAW weather for the airports. <APTS> is to be replaced with a comma delimited
// list of airports.  Example 'KBHM,KHSV'
const URL = 'https://www.aviationweather.gov/metar/data?ids=<APTS>&format=raw&hours=0&taf=off&layout=off&date=0';
const WEATHER_URL = 'https://www.aviationweather.gov/adds/dataserver_current/httpparam?dataSource=metars&requestType=retrieve&format=xml&hoursBeforeNow=1.5&stationString=<APTS>';

// This class defines the config file storing:
// . Number of LEDs used
// . List of airports and their associated LED#
module.exports = class ConfigFile {
	constructor() {
		this.LEDs = 0;
		this.WindSpeed = 10;
		this.Airports = [];
	}

	// Save the ConfgFile instance to a JSON file called 'filename'.  Using the
	// propsToSave array of property names causes the JSON.stringify to only save
	// those named properties to the config file.
	save(filename) {
		var stream = fs.createWriteStream(filename);
		var ss = JSON.stringify(this, propsToSave, 2);
		stream.write(ss);
		stream.end();
	}

	// Load the ConfigFile instance from 'filename'.  Reloads the JSON data from
	// the config file and recreates the Airports array from that information.
	load(filename) {
		try {
			this.loadFromJSON(JSON.parse(fs.readFileSync(filename, 'utf8')));
		}
		catch (ex) {
			// If exception then start with blank config file
			this.LEDs = 50;
			this.WindSpeed = 10;
			this.Airports = [];
		}
	}

	// Take a JSON object (formatted correctly) and apply it to the configuration
	loadFromJSON(jsonObj) {
		this.LEDs = jsonObj.LEDs;
		this.WindSpeed = jsonObj.WindSpeed;
		var apts = [];
		jsonObj.Airports.forEach(function (el) {
			var ap = new Airport();
			ap.LEDIndex = el.LEDIndex;
			ap.Name = el.Name;
			apts.push(ap);
		});
		this.Airports = apts;
	}

	// This method will update the information about airports fromthe gov.weather
	// web page.
	updateFromWeb(callback) {
		console.log("updateFromWeb...");
		// Build a comma delimited list of airport names
		var apts = '';
		this.Airports.forEach(function (el) {
			if (apts != '')
				apts += ',';
			apts += el.Name;
		});

		// Get the url string with those listed airports
		var url = URL.replace('<APTS>', apts);

		// Make the call to the web site and get the data back
		https.get(url, (result) => {
			var body = '';
			result.on('data', (data) => {
				body += data;
			});
			result.on('end', () => {
				try {
					// Here we need to get the string for the airport status and stick it in the Airport object
					var rawRX = /<code>(.*?)<\/code>/g;

					var match = rawRX.exec(body);
					while (match != null) {
						var codeAndTime = /^(.*?)\s(\d{2})?(\d{4})Z\s/;
						var mCD = codeAndTime.exec(match[1]);
						// Found code and DateTime (Not using DateTime right now it is just the latest time)
						if (mCD != null) {
							// Find the air port in the list.  Should be there because we used the airport list
							// to call the url, but if not then skip it
							var apt = this.Airports.find(function (el) {
								if (el.Name == mCD[1])
									return el;
							});
							// Airport found! So get the information and set it.
							if (apt != null) {
								var visRX = /(\d+)SM/;
								var cldRX = /SKC|CLR|NSC|((FEW|SCT|BKN|OVC)(\d{3}))/g;
								var wndRX = /(\d{3}|VRB)?(\d{2}G|\d{2})KT/;
								var mntRX = /\$/;

								// Set the Raw value
								apt.Raw = match[1];

								// Get visibility
								var mVIS = visRX.exec(match[1]);
								// If this is null (missing) then default to 10
								apt.Visibility = (mVIS==null)?10:mVIS[1];

								// Get cloud ceiling
								var cloudCeiling = null;
								var mCLD = cldRX.exec(match[1]);
								while (mCLD != null) {
									if ((mCLD[2] == 'BKN' || mCLD[2] == 'OVC') &&
										(cloudCeiling === null || cloudCeiling > mCLD[3])) {
										cloudCeiling = mCLD[3];
									}
									mCLD = cldRX.exec(match[1]);
								}
								apt.CloudCeiling = cloudCeiling;

								// Get the windspeed
								var mWND = wndRX.exec(match[1]);
								apt.WindSpeed = (mWND==null)?null:mWND[2];

								// Check for maintenance check
								var mMNT = mntRX.exec(match[1]);
								apt.MaintenanceCheck = (mMNT != null) ? true : false;

								// Set the flight category
								apt.setFlightCategory();
							}
						}
						match = rawRX.exec(body);
					}
					if (callback != null) {
						console.log('Calling callback from updateFromWeb');
						callback(this);
					}
				}
				catch (ex) {
					console.log(ex);
				}
			});
		}).on('error', function (e) {
			console.log('Weather Read Error:' + e.message);
			});
	}
}
