var zlib = require('zlib'),
    fs = require('fs'),
    should = require('should'),
    Planner1 = require('../lib/BasicCSA.js'),
    //Planner2 = require('../lib/ConnectionScanner.js'),
    Deserialize = require('./data/Deserialize.js'),
    async = require('async');

describe("We're going to fire a couple of queries", function () {
  async.each([ // Brugge, Leuven, Lichtervelde
    "stops:008891009","stops:008833001","stops:008892205"
  ], function (station1, done1) {
    async.each([ // Gent-Sint-Pieters, Brussel-Centraal, Antwerpen-Centraal
      "stops:008892007","stops:008813003", "stops:008821006"
    ], function (station2, done2) {

      //let's create our route planner
      if (station1 !== station2) {
        var query = {
          departureStop : station1,
          departureTime : new Date("2015-09-15T00:00:00.000Z"),
          latestArrivalTime : new Date("2015-09-16T24:00:00.000Z"),
          arrivalStop : station2
        };
        var planner1 = new Planner1(query);
        describe(station1 + " to " + station2, function () {
          it("should yield a result", function (done) {
            //open and pipe the stream of connections
            var readStream = fs.createReadStream('test/data/2015/connections1516.jsonldstream.gz', {flags: 'r'});
            readStream.pipe(zlib.createGunzip()).pipe(new Deserialize()).pipe(planner1).on("data", function() {});
            
            planner1.on("result", function (path) {
              // console.dir(path);
              readStream.close();
              done2();
              done();
            });

            readStream.on("end", function () {
              done("no path found");
              done2();
            });
          });
        });
      } else {
        done2();
        //it("should not return anything because the stations are the same");
      }
    }, function (error) {
      done1();
    });
  }, function (error) {
    //nothing...
  });
}) 
