var assert = require("assert"),
    async = require('async'),
    fs = require('fs'),
    Deserialize = require('./data/Deserialize.js'),
    MergeStream = require('../lib/MergeStream.js'),
    Planner = require('../lib/BasicCSA.js');

describe('connectionsStream', function() {
  it('should return connections ordered by their departure time', function(done) {
    var self = this;
    var count = 0;

    var connectionsStream = fs.createReadStream('test/data/connections-nmbs.jsonldstream', {flags: 'r'}).pipe(new Deserialize());
    connectionsStream.on('data', function(connection) {
      // Check if connections are ordered
      if (!self._departureTime) {
        self._departureTime = connection['departureTime']; // First connection departure time is minimum
      } else if (connection['departureTime'] >= self._departureTime) {
        // Update time tracker
        self._departureTime = connection['departureTime'];
      } else {
        throw new Error("Connections are not ordered by their departure time");
      }
      count++;
    });

    connectionsStream.on('end', function() {
      assert.equal(count, 78);
      done();
    });
  });
});

describe('MergeStream', function() {
  // ConnectionsStreams are supposed to be ordered already
  var connectionsStreams = [
    //[ 'NS', fs.createReadStream('test/data/connections-ns.jsonldstream', {flags: 'r'}).pipe(new Deserialize()) ],
    [ 'NMBS', fs.createReadStream('test/data/connections-nmbs.jsonldstream', {flags: 'r'}).pipe(new Deserialize()) ]
  ];

  describe('#read()', function () {
    it('should return connections ordered by departure time', function (done) {
      var self = this;
      var count = 0;

      this._departureTime = new Date("2015-10-10T09:00:00.000Z"); // Should come from query
      var mergeStream = new MergeStream(connectionsStreams, this._departureTime);
      // Start mergeStream
      mergeStream.start();
      debugger;
      mergeStream.on('data', function (connection) {
                debugger;
        // Do some stuff with the connection and make decision
        // console.error(connection);
        if (connection['@context']) {
          // do nothing with context
        } else if (connection['departureTime'] >= self._departureTime) {
          // Update time tracker
          self._departureTime = connection['departureTime'];
          count++;
        } else {
          count++;
          throw new Error("Merged connections are not ordered by their departure time");
        }

        // Resume the mergeStream
        mergeStream.start();
      });

      mergeStream.on('end', function() {
        assert.equal(count, 76);
        done();
      });
    });
  });
});

// describe('CSA', function() {
//   // ConnectionsStreams are supposed to be ordered already
//   var connectionsStreams = [
//     [ 'NS', fs.createReadStream('test/data/connections-ns.jsonldstream', {flags: 'r'}).pipe(new Deserialize()) ],
//     [ 'NMBS', fs.createReadStream('test/data/connections-nmbs.jsonldstream', {flags: 'r'}).pipe(new Deserialize()) ]
//   ];

//   var query = {
//     // Intermodal route
//     departureStop : "A",
//     departureTime : new Date("2015-10-10T00:10:00.000Z"),
//     latestArrivalTime : new Date("2015-10-11T07:10:00.000Z"),
//     arrivalStop : "E"
//   };

//   it('should return an intermodal route', function (done) {
//     var mergeStream = new MergeStream(connectionsStreams, query.departureTime);
//     var planner = new Planner(query);
//     var result = mergeStream.pipe(planner);
//     // Start mergeStream
//     mergeStream.resume();
//     result.on("data", function (data) {
//       //without something that's reading the data, the stream won't start
//     });
//     result.on("result", function (path) {
//       mergeStream.close();
//       done();
//       doneEntry();
//     });
//     result.on("error", function (error) {
//       done("error encountered" + error);
//       doneEntry();
//     });
//     result.on("end", function () {
//       done("no path found");
//       doneEntry();
//     });
//   });
// });

// describe('Mergestream', function() {
//   // ConnectionsStreams are supposed to be ordered already
//   var connectionsStreams = [
//     [ 'NMBS', fs.createReadStream('test/data/connections-nmbs.jsonldstream', {flags: 'r'}).pipe(new Deserialize()) ]
//   ];

//   var query = {
//     // Intermodal route
//     departureStop : "A",
//     departureTime : new Date("2015-10-10T00:10:00.000Z"),
//     latestArrivalTime : new Date("2015-10-11T07:10:00.000Z"),
//     arrivalStop : "C"
//   };

//   it('should read NMBS first and after time treshold also NS', function (done) {
//     // MergeStream is paused by default so you can add/remove streams like you wish first
//     var mergeStream = new MergeStream(connectionsStreams, query.departureTime);

//     var threshold = new Date("2015-10-10T09:54:00.000Z");
//     var planner = new Planner(query);
//     var result = mergeStream.pipe(planner);

//     // Start mergeStream
//     mergeStream.resume();
//     debugger;
//     result.on("data", function (data) {
//       debugger;
//       // Start merging NS
//       // if (data['departureTime'] >= threshold) {
//       //   debugger;
//       //   mergeStream.addConnectionsStream('NS');
//       // }
//       mergeStream.resume();
//     });
//     result.on("result", function (path) {
//       mergeStream.close();
//       done();
//       doneEntry();
//     });
//     result.on("error", function (error) {
//       done("error encountered" + error);
//       doneEntry();
//     });
//     result.on("end", function () {
//       done("no path found");
//       doneEntry();
//     });
//   });
// });
