var Transform = require('stream').Transform,
    util = require('util'),
    StreamIterator = require('./StreamIterator.js');

/**
 * The multiplexer merges two connectionsStreams into one while maintaining departure time ordering.
 */
function Multiplexer (connectionsQueueStream, syncedDepartureTime) {
  Transform.call(this, {objectMode : true});
  var self = this;
  this._connectionsQueueStream = connectionsQueueStream;
  this._connectionsIterator = new StreamIterator(this._connectionsQueueStream);
  this._departureTime = syncedDepartureTime; // Keeps track of departureTime that is being piped
  this._queue = []; // Holds merged connections that will be passed first
  this._flushed = false;
  this._merge = true; // When set to false, it just let the connections pass without merging own connections
}

util.inherits(Multiplexer, Transform);

Multiplexer.prototype._flush = function (done) {
  var self = this;

  if (this._firstConnectionInQueue) {
    this._queue.push(this._firstConnectionInQueue);
  }

  // Push all remaining connections in queue
  this._connectionsIterator.next(function (connectionInQueue) {
    self._pushRemainingConnectionsInQueue(connectionInQueue);
  });

  // Push queue
  while (this._queue.size() > 0) {
    this.push(this._queue.shift());
  }

  done();
};

Multiplexer.prototype._transform = function (connection, encoding, done) {
  var self = this;
  this._done = done; // Start next transform if previous transform is finished by pushing all from queue
  // Incoming connection that is before the synced departure time should be ignored
  if (!connection || connection['departureTime'] < this._departureTime) {
    done();
  } else if (!this._merge) {
    // Don't merge, just let it flow through
    this._queue.push(connection);
    // Keep track of last pushed departureTime in case this gets activated again
    this._departureTime = connection['departureTime'];
  } else if (!this._flushed) {
    // Only first time
    this._flushed = true;
    // Flush connections that depart before synchronized departureTime
    this._connectionsIterator.next(function (connectionInQueue) {
      self._removePreviousConnections(connection, connectionInQueue, done);
    });
  } else if (!this._firstConnectionInQueue) {
    // Process next connection in queue
    this._connectionsIterator.next(function (connectionInQueue) {
      self._process(connection, connectionInQueue, done);
    });
  } else {
    // We already read first connection in queue, process that one first
    this._process(connection, this._firstConnectionInQueue, done);
  }
};

// New connection sets synced departureTime
Multiplexer.prototype._process = function (connection, connectionInQueue, done) {
  var self = this;
  // 1. Align our queue with incoming connection
  if (this._merge && connectionInQueue['departureTime'] <= connection['departureTime']) {
    this._queue.push(connectionInQueue);
    this._connectionsIterator.next(function (newConnectionInQueue) {
      self._process(connection, newConnectionInQueue, done); // Recursion
    });
  } else {
    // 2. Set the bar higher if new connection is higher than current synced departureTime
    if (connection['departureTime'] > this._departureTime) {
      this._departureTime = connection['departureTime'];
    }
    this._firstConnectionInQueue = connectionInQueue;
    this._queue.push(connection);
  }
};

// Removes all connections from queue that depart before synced departureTime
Multiplexer.prototype._removePreviousConnections = function (connection, connectionInQueue, done) {
  var self = this;
  if (connectionInQueue['departureTime'] < this._departureTime) {
    // Ignore and call next
    this._connectionsIterator.next(function (newConnectionInQueue) {
      self._removePreviousConnections(connection, newConnectionInQueue, done); // recursion
    });
  } else {
    // Connections in queue are now synced. Start merging.
    this._process(connection, connectionInQueue, done);
  }
};

Multiplexer.prototype._pushRemainingConnectionsInQueue = function (connectionInQueue) {
  this._queue.push(connectionInQueue);
  var self = this;
  this._connectionsIterator.next(function (nextConnectionInQueue) {
    if (nextConnectionInQueue) {
      self._pushRemainingConnectionsInQueue(nextConnectionInQueue); // recursion
    }
  });
};

Multiplexer.prototype.close = function () {
  if (this._connectionsQueueStream) {
    this._connectionsQueueStream.end();
  }
  this.end();
};

Multiplexer.prototype.next = function() {
  if (this._queue.length > 0) {
    this.push(this._queue.shift());
  } else {
    this._done(); // Load next transformation in queue
  }
};

// The multiplexer stops merging the queue and lets connections flow futher
Multiplexer.prototype.stopMerging = function () {
  this._merge = false;
};

// Reactivate the multiplexer by setting a departure time to start merging at
Multiplexer.prototype.startMergingAgain = function () {
  this._flushed = false; // Will remove departed connections
  this._merge = true;
  // Reset first connection if not valid anymore
  if (this._firstConnectionInQueue && this._firstConnectionInQueue['departureTime'] < this._departureTime) {
    this._firstConnectionInQueue = null;
  };
}

module.exports = Multiplexer;
