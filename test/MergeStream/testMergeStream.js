var assert = require("assert"),
    async = require('async'),
    fs = require('fs'),
    moment = require('moment'),
    Deserialize = require('../data/Deserialize.js'),
    MergeStream = require('../../lib/MergeStream.js');

describe('connectionsStream', function() {
  it('should return connections', function(done) {
    var self = this;
    self._done = done;
    self._amount = 0;

    var connectionsStream1 = fs.createReadStream('connections-1.jsonldstream', {flags: 'r'}).pipe(new Deserialize());
    connectionsStream1.on('data', function(connection) {
      // console.error(connection);   
      self._amount++;
    });

    connectionsStream1.on('end', function() {
      assert.equal(self._amount, 7);
      self._done();
    });
  });
});

describe('MergeStream', function() {
  var mergeStream = new MergeStream();     
  var connectionsStream1 = fs.createReadStream('connections-1.jsonldstream', {flags: 'r'}).pipe(new Deserialize());  
  var connectionsStream2 = fs.createReadStream('connections-2.jsonldstream', {flags: 'r'}).pipe(new Deserialize());

  describe('#addConnectionsStream()', function () {
    it('should add connectionsStreams without error', function () {
      mergeStream.addConnectionsStream(connectionsStream1);
      mergeStream.addConnectionsStream(connectionsStream2);
    });
  });

  describe('#read()', function () {
    it('should return connections ordered by departure time', function (done) {
      var self = this;
      self._done = done;
      self._amount = 0;

      mergeStream.on('data', function (connection) {
        if (!self._departureTime) {
          self._departureTime = moment(connection['departureTime']).toDate();
          self._amount++;
        } else if (connection['departureTime'] >= self._departureTime) {
          // Update time tracker
          self._departureTime = connection['departureTime'];
          self._amount++;
        } else if (connection['departureTime'] < self._departureTime) {
          // Not ordered
          //console.error(connection);
        }
      });

      mergeStream.on('error', function (error) {
        console.error(error);
      });

      mergeStream.on('end', function() {
        assert.equal(self._amount, 14); // Amount is 10. Beginning of streaming isn't parallel.
        self._done();
      });
    });
  });

  describe('#close()', function () {
    it('should close connectionsStreams without error', function() {
      mergeStream.close();
    });
  });
});
