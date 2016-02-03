var mongoose = require('mongoose');

var Schema = mongoose.Schema;

// create a schema
var userSchema = new Schema({
  name: { type: String, unique: true },
  password: String,
  type: String,
  description: String
});

var User = mongoose.model('User', userSchema);
module.exports = User;