var mongoose = require('mongoose');

var Schema = mongoose.Schema;

// create a schema
var userSchema = new Schema({
  topics: String,
  subs: String
});

userSchema.index({topics: 1, subs: 1}, {unique: true});

var PubSub = mongoose.model('pubsub', userSchema);
module.exports = PubSub;