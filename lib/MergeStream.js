var Readable = require('stream').Readable,
    util = require('util'),
    Multiplexer = require('./Multiplexer.js');

/**
 * A merger returns connections from different endpoints while maintaining departure time ordered. 
 * The merger manages multiplexers. Each combines two streams into one.
 */
var MergeStream = function(connectionsStreams, departureTimeSync) {
  Readable.call(this, {objectMode: true});
  var self = this;
  this._multiplexers = []; // array of transformstreams
  this._departureTime = departureTimeSync; // departureTime that we synchronize our multiplexers with
  this._mergedConnections = []; // Save connections to this queue

  if (connectionsStreams) {
    this._ultimateMergeStream = connectionsStreams[0]; // First one to start with

    // Build serie of multiplexers
    for (var k=1; k<connectionsStreams.length; k++) {
      var multiplexer = new Multiplexer(connectionsStreams[k], this._departureTime);
      this._multiplexers.push(multiplexer);
      this._ultimateMergeStream = this._ultimateMergeStream.pipe(multiplexer);
    }

    this._ultimateMergeStream.on('data', function (connection) {
        self.push(connection);
    });

    this._ultimateMergeStream.on('end', function () {
      self.close();
    });
  }
};

util.inherits(MergeStream, Readable);

MergeStream.prototype.close = function () {
  // Close all multiplexers
  for (var k=0; k<this._multiplexers.length; k++) {
    if (this._multiplexers[k]) {
      this._multiplexers[k].close();
    }
  }

  this.push(null);
};

MergeStream.prototype._read = function() {};

module.exports = MergeStream;