var Readable = require('stream').Readable,
    util = require('util'),
    moment = require('moment');

/** A merger returns connections from different endpoints while maintaining departure time ordered. */
var MergeStream = function() {
  Readable.call(this, {objectMode: true});
  this._connectionsStreams = [];
  this._amountStreams = 0;
  this._queues = []; // Every queue contains ordered connections
  this._departureTime = null; // Keeps track of departureTime that we return connections from
};

util.inherits(MergeStream, Readable);

MergeStream.prototype.close = function () {
  this._queues = [];

  if (this._amountStreams > 0) {
    // Close all connectionsStreams
    for (var k=0; k<this._connectionsStreams.length; k++) {
      if (this._connectionsStreams[k]) {
        this._connectionsStreams[k].close();
      }
    }
  }

  this.push(null);
};

MergeStream.prototype.addConnectionsStream = function (stream) {
  var self = this;
  
  self._connectionsStreams.push(stream);
  self._amountStreams++;

  stream.on('data', function (connection) {
    // Set departureTime tracker
    if (!self._departureTime) {
      self._departureTime = connection['departureTime'];
    }
    self._addConnection(connection); // add to queue
    self._read(); // Otherwise it stops reading/pushing data
  });

  stream.on('end', function() {
    self._amountStreams--;
    if (self._amountStreams == 0) {
      self.close();
    }
  });

  stream.on('error', function (error) {
    // console.error(error);
  });
};

MergeStream.prototype._addConnection = function (connection) {
  var added = false;

  var i = 0;
  while (!added && i<this._queues.length) {
    var length = this._queues[i].length;

    // If the queue is empty or connection departureTime is later then last connection in the queue
    if (length == 0 || this._queues[i][length - 1]['departureTime'] <= connection['departureTime']) {
      this._queues[i].push(connection);
      added = true;
      return;
    }
    i++;
  }

  if (!added) {
    // add new queue
    var newQueue = [ connection ];
    this._queues.push(newQueue);
  }
};

// Returns all connections that depart
MergeStream.prototype._read = function() {
  var nextDepartureTime = null; // Normally next departureTime is one minute later

  if (this._queues.length != 0) {
    for (var i=0; i<this._queues.length; i++) {
      var queue = this._queues[i];

      var done = false;
      while (queue.length > 0 && !done) {
        // Already passed
        if (queue[0]["departureTime"] < this._departureTime) {
          queue.shift();
        } else if (queue[0]["departureTime"] == this._departureTime) {
          var conn = queue.shift();
          this.push(conn); // return and remove first element
        } else if (!nextDepartureTime && queue[0]["departureTime"] >= moment(this._departureTime).add(1, 'minutes').toDate()) {
          nextDepartureTime = queue[0]["departureTime"];
          done = true;
        } else if (nextDepartureTime && queue[0]["departureTime"] < nextDepartureTime) {
          // Doesn't happen in first queue
          nextDepartureTime = queue[0]["departureTime"];
          done = true;
        } else {
          done = true;
        }
      }
    }

    if (!nextDepartureTime) {
      this._departureTime = moment(this._departureTime).add(1, 'minutes').toDate();
    } else {
      // Next fetched connections will be next earliest departureTime
      this._departureTime = nextDepartureTime;
    }
  }
};

module.exports = MergeStream;
