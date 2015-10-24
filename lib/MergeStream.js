var Readable = require('stream').Readable,
    util = require('util'),
    Multiplexer = require('./Multiplexer.js');

/**
 * A merger returns connections from different endpoints while maintaining departure time ordered. 
 * The merger manages multiplexers. Each combines two streams into one.
 */
var MergeStream = function (connectionsStreams, departureTimeSync) {
  Readable.call(this, {objectMode: true});
  var self = this;
  this._multiplexers = []; // array of transformstreams
  this._connectionsStreamNames = {}; // map connectionsStream name on index
  this._departureTime = departureTimeSync; // departureTime that we synchronize our multiplexers with
  this._mergedConnections = []; // Save connections to this queue

  if (connectionsStreams) {
    this._ultimateMergeStream = connectionsStreams[0][1]; // First one to start with
    var name = connectionsStreams[0][0];
    this._connectionsStreamNames[name] = 0;// Map "name provider" - "index"

    // Build serie of multiplexers
    for (var k=1; k<connectionsStreams.length; k++) {
      name = connectionsStreams[k][0];
      this._connectionsStreamNames[name] = k;

      var multiplexer = new Multiplexer(connectionsStreams[k][1], this._departureTime);
      this._multiplexers.push(multiplexer);
      this._ultimateMergeStream = this._ultimateMergeStream.pipe(multiplexer);
    }

    debugger;
    this._ultimateMergeStream.on('data', function (connection) {
      if (self._multiplexers.length == 0) {
        self._ultimateMergeStream.pause();
      }
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

MergeStream.prototype.start = function() {
  if (this._multiplexers.length > 0) {
    debugger;
    for (var k=0; k<this._multiplexers.length; k++) {
      this._multiplexers[k].next();
    }
  } else {
    // Just one connection stream
    this._ultimateMergeStream.resume();
  }
};

MergeStream.prototype.stopMerging = function (name) {
  var stream = this._multiplexers[this._connectionsStreamNames[name]];
  stream.stopMerging();
};

MergeStream.prototype.startMergingAgain = function (name) {
  var stream = this._multiplexers[this._connectionsStreamNames[name]];
  stream.startMergingAgain();
};

MergeStream.prototype.addConnectionsStream = function (connectionsStream) {
  var name = connectionsStream[0][0];
  this._connectionsStreamNames[name] = this._multiplexers.size();

  var multiplexer = new Multiplexer(connectionsStream[0][1], this._departureTime);
  this._multiplexers.push(multiplexer);
  this._ultimateMergeStream = this._ultimateMergeStream.pipe(multiplexer);
}

module.exports = MergeStream;
