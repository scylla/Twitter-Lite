# Twitter-Lite
nodejs websockets based realtime feeds application

This is a simple realtime feed application built using nodejs and web-sockets(socket.io)
MongoDb is used for persistence and mongoose for ORM
This uses PubSub design pattern, subscribers registers to a topic and receives a message is publisher posts a feed
Currently a single publisher can only provide feed for single topic and unsubscribing is not implememted for subscriber.

To run, make sure mongod is running.
Then simply go to app folder and from terminal : node app.js
The app can be accessed on browser at localhost:3000
