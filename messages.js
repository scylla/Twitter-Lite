var mongoose = require('mongoose');

var Schema = mongoose.Schema;

// create a schema
var userSchema = new Schema({
  user: {type: String, unique: true},
  msgqueue: []
});

var Messages = mongoose.model('messages', userSchema);
module.exports = Messages;