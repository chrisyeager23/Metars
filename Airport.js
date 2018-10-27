// This is a class that defines information about an airport.
// There things we want to know about the airport.  The Windspeed and
// Status will be added later when pulled from the HTML page.  Only
// the Name and LEDIndex will be persisted in the ConfigFile. (See the 
// 'propsToSave' constant in the ConfigFile.js.
module.exports = class Airport {
	// Constructor
	constructor() {
		this.Name = '';
		this.LEDIndex = -1;
	}

	// Sets the flight category and the LED color
	setFlightCategory() {
		if (this.Visibility > 5 && (this.CloudCeiling === null || this.CloudCeiling > 30)) {
			this.FlightCategory = 'VFR';
			this.LEDColor = 0xff0000;   // GGRRBB
		}
		else if (this.Visibility >= 3 && this.CloudCeiling >= 10) {
			this.FlightCategory = 'MVFR';
			this.LEDColor = 0x0000ff;   // GGRRBB
		}
		else if (this.Visibility >= 1 && this.CloudCeiling >= 5) {
			this.FlightCategory = 'IFR';
			this.LEDColor = 0x00FF00;   // GGRRBB
		}
		else {
			this.FlightCategory = 'LIFR';
			this.LEDColor = 0x00ffff;   // GGRRBB
		}
  }
}