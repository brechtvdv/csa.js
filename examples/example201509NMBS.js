var fs = require('fs'),
    zlib = require('zlib'),
    Planner = require('../lib/BasicCSA.js'),
    Deserialize = require('../test/data/Deserialize.js');

//let's create our route planner
try {
  var query = {
    departureStop : "stops:008892205", // Lichtervelde
    departureTime : new Date("2015-09-15T00:00:00.000Z"),
    latestArrivalTime : new Date("2015-09-16T24:00:00.000Z"),
    arrivalStop : "stops:008821006" // Antwerpen-Centraal
  };
  var planner = new Planner(query);

  //open and pipe the stream of connections
  var deserializeStream = new Deserialize();

  var readStream = fs.createReadStream('../test/data/2015/connections1516.jsonldstream.gz', {flags: 'r'});
  readStream.pipe(zlib.createGunzip()).pipe(deserializeStream).pipe(planner);

  planner.on("data", function (connection) {
      // console.log(JSON.stringify(connection));
  });

  planner.on("result", function (solution) {
    console.dir(solution);
    readStream.close();
  });

  readStream.on("end", function () {
    console.error("End of stream reached.");
  });

} catch (e) {
  console.error(e);
}
