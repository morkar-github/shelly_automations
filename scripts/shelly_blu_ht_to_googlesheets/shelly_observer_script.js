// Konfiguration
var GOOGLE_URL = "__google_api_endpoint_url__";
var INTERVAL_MINUTES = 30; 
var SENSOR_NAME = "__sensor_name__";
var LOGGING = 0
var TARGET_ADDR = "__bthome_device_mac_addr__";

var last_t = null;
var last_h = null;
var last_battery = null;
var last_measurement_ts = null;

// BLE scanner
BLE.Scanner.subscribe(function(event, result) {
  if (event !== BLE.Scanner.SCAN_RESULT) {
    return;
  }
  // Only accept our specific BLU H&T
  if (result.addr !== TARGET_ADDR) {
    return;
  }

  if (!result.service_data || !result.service_data["fcd2"]) {
    return;
  }

  var values = BTHome.parseData(result.service_data["fcd2"]);

  if (!values) {
    return;
  }

  for (var i = 0; i < values.length; i++) {
    var value = values[i];

    if (value.name === "temperature") {
      last_t = value.val;
    }
    else if (value.name === "humidity") {
      last_h = value.val;
    }
    else if (value.name === "battery") {
      last_battery = value.val;
    }
  }

  // Packet received from the target BLU H&T
  last_measurement_ts = new Date();
});

function log_msg(msg) {
  if(LOGGING === 1){
    print(msg)
  }
}

// Send latest measurement
function send_measurement() {
  if (last_measurement_ts === null) {
    log_msg("no BLU HT measurement received yet from " + TARGET_ADDR);  
    return;
  }

  var payload = JSON.stringify({
    sensor: SENSOR_NAME,
    timestamp: last_measurement_ts.toISOString(),
    t: last_t,
    h: last_h,
    battery: last_battery
  });

  Shelly.call("HTTP.POST", {
    url: GOOGLE_URL,
    content_type: "application/json",
    body: payload
  }, function(res, err) {
    if (err === 0) {
        log_msg(
          "sent: " +
          last_t + " °C, " +
          last_h + " %, " +
          last_battery + " %"
        );
    } else {
      log_msg("http_post_failed: " + JSON.stringify(err));
    }
  });
}


Timer.set(
  INTERVAL_MINUTES * 60 * 1000,
  true,
  send_measurement
);