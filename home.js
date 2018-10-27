module.exports = class home {
	// Function to create the setup screen
	doIt(data, req, res, cf) {
		try {
			const AP_LIST_ITEM = '<tr><td>{NAME}</td><td>{LED}</td><td>{FLIGHTC}</td><td>{WIND}</td><td>{VISI}</td><td>{CEILING}</td><td>{MAINT}</td><td>{RAW}</td></tr>\r\n';
			var items = '';
			cf.Airports.forEach((a) => {
				var item = AP_LIST_ITEM.replace('{NAME}', a.Name)
					.replace('{LED}', a.LEDIndex)
					.replace('{FLIGHTC}', a.FlightCategory)
					.replace('{WIND}', a.WindSpeed)
					.replace('{VISI}', a.Visibility)
					.replace('{CEILING}', a.CloudCeiling)
					.replace('{MAINT}', a.MaintenanceCheck)
				  .replace('{RAW}', a.Raw);
				items += item;
			});
			data = data.toString().replace('{AIRPORT_LIST}', items);
			return data;
		}
		catch (ex) {
			console.log(ex);
		}
	}
}