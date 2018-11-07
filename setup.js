module.exports = class setup {
	// Function to create the setup screen
	doIt(data, req, res, cf) {
		const AP_LIST_ITEM = '<tr><td id="AP_{IDX}" draggable="true" ondragstart="drag(event)">{NAME}</td></tr>\r\n';
		const FC_LIST_ITEM = '<tr><td id="FC_{IDX}" draggable="true" ondragstart="drag(event)">{NAME}</td></tr>\r\n';
		const LED_ITEM = '<div class="p-0" style="border:1px solid black;height:30px;width:82px;" ondrop="drop(event)" ondragover="allowDrop(event)"><button type="button" style="width:30px;padding:0px;margin:0;" onclick="led_click(this)">{LED_ID}</button><span id="LBL_{LED_ID}" ondblclick="led_clear(this)">{NAME}</span></div>';
		var aptList = '';
		var fcList = '';
		// Sort airports 
		cf.Airports.sort(function (a, b) {
			if (a.Name < b.Name) return -1;
			if (b.Name < a.Name) return 1;
			return 0;
		});
		// Stick airports it in the table
		var idx = 1;
		cf.Airports.forEach((a) => {
			var item = AP_LIST_ITEM.replace(new RegExp('{NAME}', 'g'), a.Name)
				.replace(new RegExp('{IDX}', 'g'), idx++);
			aptList += item;
		});
		// Stick flight categories in the table
		idx = 1;
		cf.FlightCategories.forEach((fc) => {
			var item = FC_LIST_ITEM.replace(new RegExp('{NAME}', 'g'), fc.Name)
				.replace(new RegExp('{IDX}', 'g'), idx++);
			fcList += item;
		});

		// Make the LED table
		try {
			var ledList = '';
			for (var led = 1; led <= cf.LEDs; led += 1) {
				var ap = cf.Airports.find(a => a.LEDIndex == led);
				var fc = cf.FlightCategories.find(f => f.LEDIndex == led);
				var name = (ap == null) ? ((fc == null) ? '&nbsp;' : fc.Name) : ap.Name;

				ledList += LED_ITEM.replace(new RegExp('{LED_ID}', 'g'), (led).toString())
					.replace(new RegExp('{NAME}', 'g'), name);
			}
		}
		catch (ex) {
			console.log(ex);
		}
		data = data.toString().replace('{AIRPORT_ITEMS}', aptList);
		data = data.toString().replace('{FC_ITEMS}', fcList);
		data = data.toString().replace('{LED_ITEMS}', ledList);
		data = data.toString().replace('{WNDSPEED}', cf.WindSpeed);

		return data;
	}
}