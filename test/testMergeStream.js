var assert = require("assert"),
    async = require('async'),
    fs = require('fs'),
    Deserialize = require('./data/Deserialize.js'),
    MergeStream = require('../lib/MergeStream.js');

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
      assert.equal(count, 74);
      done();
    });
  });
});

describe('MergeStream', function() {
  // ConnectionsStreams are supposed to be ordered already
  var connectionsStreams = [
    fs.createReadStream('test/data/connections-ns.jsonldstream', {flags: 'r'}).pipe(new Deserialize()),
    fs.createReadStream('test/data/connections-nmbs.jsonldstream', {flags: 'r'}).pipe(new Deserialize())
  ];

  describe('#read()', function () {
    it('should return connections ordered by departure time', function (done) {
      var self = this;
      var count = 0;

      this._departureTime = new Date("2015-10-10T09:00:00.000Z"); // Should come from query
      var mergeStream = new MergeStream(connectionsStreams, this._departureTime);
      
      mergeStream.on('data', function (connection) {
        // console.error(connection);
        if (connection['departureTime'] >= self._departureTime) {
          // Update time tracker
          self._departureTime = connection['departureTime'];
        } else {
          throw new Error("Merged connections are not ordered by their departure time");
        }
        count++;
      });

      mergeStream.on('end', function() {
        assert.equal(count, 71);
        done();
      });
    });
  });
});
