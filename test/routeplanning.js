var zlib = require('zlib'),
    fs = require('fs'),
    should = require('should'),
    Planner = require('../lib/BasicCSA.js'),
    Deserialize = require('./data/Deserialize.js'),
    async = require('async');

describe('Route planning queries', function () {
  //Read stations in memory
  var stations = JSON.parse(fs.readFileSync('test/data/2013/stations.json', 'utf8'));
  var queries = [
    {
      //Short travel: should only contain 2 stops
      departureStop : "stops:32829",
      departureTime : new Date("2013-12-16T00:00:00.000Z"),
      latestArrivalTime : new Date("2013-12-17T12:00:00.000Z"),
      arrivalStop : "stops:32830"
    },
    {
      //Short travel: should only contain 2 stops
      departureStop : "stops:32830",
      departureTime : new Date("2013-12-16T00:00:00.000Z"),
      latestArrivalTime : new Date("2013-12-17T12:00:00.000Z"),
      arrivalStop : "stops:32829"
    },
    {
      //Long travel: should contain multiple stops
      departureStop : "stops:32829",
      departureTime : new Date("2013-12-16T00:00:00.000Z"),
      latestArrivalTime : new Date("2013-12-17T12:00:00.000Z"),
      arrivalStop : "stops:32831"//"stops:32842"//
    }//,"stops:32830","stops:32831","stops:32832","stops:32833","stops:32834","stops:32835","stops:32836","stops:32837","stops:32838","stops:32839","stops:32840","stops:32841","stops:32842","stops:32843","stops:32844","stops:32845","stops:32846"
  ];
  async.each(queries, function (query, doneEntry) {
    //let's create our route planner
    var planner = new Planner(query);
    describe(stations[query.departureStop].name + " (" + query.departureStop + ") to " + stations[query.arrivalStop].name + " (" + query.arrivalStop + ")", function () {
      var readStream = fs.createReadStream('test/data/2013/test20131216.json.gz', {flags: 'r'});
      var result = readStream.pipe(zlib.createGunzip()).pipe(new Deserialize()).pipe(planner).on("data", function(connection) {});

      it("should yield a result", function (done) {
        planner.on("result", function (path) {
          done();
          //doneEntry();
          readStream.close();
        });
        result.on("error", function (error) {
          done("error encountered" + error);
        });
        result.on("end", function () {
          // done("no path found");
          done(); // end happens before result with last query
        });
      });
    });
  }, function (error) {
      doneEntry();
  });
});
