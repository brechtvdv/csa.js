var assert = require("assert"),
    async = require('async'),
    fs = require('fs'),
    moment = require('moment'),
    Deserialize = require('./data/Deserialize.js'),
    MergeStream = require('../lib/MergeStream.js');

describe('connectionsStream', function() {
  it('should return connections ordered by their departure time', function(done) {
    var self = this;
    self._done = done;
    self._amount = 0;

    var connectionsStream1 = fs.createReadStream('test/data/connections-nmbs.jsonldstream', {flags: 'r'}).pipe(new Deserialize());
    connectionsStream1.on('data', function(connection) {
      self._amount++;

      // Check if connections are ordered
      if (!self._departureTime) {
        self._departureTime = connection['departureTime']; // First connection departure time is minimum
      } else if (connection['departureTime'].getTime() >= self._departureTime.getTime()) {
        // Update time tracker
        self._departureTime = connection['departureTime'];
      } else {
        throw new Error("Connections are not ordered by their departure time");
      }
    });

    connectionsStream1.on('end', function() {
      assert.equal(self._amount, 74);
      self._done();
    });
  });
});

describe('MergeStream', function() {
  // ConnectionsStreams are supposed to be ordered already
  var connectionsStream1 = fs.createReadStream('test/data/connections-nmbs.jsonldstream', {flags: 'r'}).pipe(new Deserialize());  
  var connectionsStream2 = fs.createReadStream('test/data/connections-ns.jsonldstream', {flags: 'r'}).pipe(new Deserialize());

  var connectionsStreams = [];
  connectionsStreams.push(connectionsStream2);
  connectionsStreams.push(connectionsStream1);

  describe('#read()', function () {
    it('should return connections ordered by departure time', function (done) {
      var self = this;
      this._done = done;
      this._amount = 0;

      this._departureTime = moment("2015-10-10T09:00:00.000Z").toDate(); // Should come from query
      var mergeStream = new MergeStream(connectionsStreams, this._departureTime);
      
      mergeStream.on('data', function (connection) {
        // console.error(connection);
        if (connection['departureTime'].getTime() >= self._departureTime.getTime()) {
          // Update time tracker
          self._departureTime = connection['departureTime'];
          self._amount++;
        } else {
          throw new Error("Merged connections are not ordered by their departure time");
        }
      });

      mergeStream.on('end', function() {
        assert.equal(self._amount, 71);
        self._done();
      });
    });
  });
});