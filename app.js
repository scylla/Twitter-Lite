var express = require('express');  
var app = express();  
var server = require('http').createServer(app);  
var io = require('socket.io')(server);
var mongoose = require('mongoose');
var User = require('./user');
var PubSub = require('./pubsub');
var Messages = require('./messages');

// namespaces for connected users
var namespaces = {};

mongoose.connect('mongodb://localhost/lTweet');

app.use(express.static(__dirname + '/bower_components'));  
app.get('/', function(req, res,next) {  
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(client) {  
    console.log('Client connected...');

    client.on('join', function(data) {
        console.log(data);
    });

    client.on('update_socket', function(data) {
        namespaces[data.name] = client;
        namespaces[data.name].emit('connected_again', "connected");

    });

    client.on('messages', function(data) {

    			var bbc = new User({
  						name: 'bbc',
  						password: 'bbc',
  						type: 'publisher',
  						description: 'news from around the globe' 
					});

					bbc.save(function(err) {
  					if (err) throw err;
  					client.emit('broad', 'User saved successfully!');
					});

          client.emit('broad', data);
          client.broadcast.emit('broad',data);
    });

    client.on('login', function(data) {
    			console.log(data);
    			User.find({ 'name': data.name, 'type' : data.type }, 'name description type password', function (err, resp) {
  						try {
  							if (err) {
  								console.log("error " + err);
  								client.emit('login_failure', {"message" : "an error occurred at server"});
  								return;
  							} else {
  								console.log("resp received " + resp.length);
  								if(resp == null || resp.length == 0)
  									client.emit('login_failure', {"message" : "wrong username or password"});
  								else {
                    if(resp[0].password == data.password) {

                     namespaces[data.name] = client;
                     namespaces[data.name].emit('login_success', {"name": data.name});
                     
                     console.log("new channel created");
	  								 
                    }
                    else 
                     client.emit('login_failure', {"message" : "wrong username or password"});
                  }
  							}
  						} catch(err) {

  						}
					})
    });


     // on register user request    
     client.on('register', function(data) {

     			console.log("register request for " + JSON.stringify(data));
    			var register = new User({
  						name: data.name,
  						password: data.password,
  						type: data.type,
  						description: data.description 
					});

          User.find({'description' : data.description, 'type' : "publisher"}, 'description', function(err, descdata){
           
                if (err) throw err;
                if(descdata.length == 0)
                  client.broadcast.emit('new_topic_available', {'name' : data.description});

                register.save(function(err) {
                if (err) {
                  console.log("error " + err);
                  client.emit('register_failure', {"message" : "an error occurred at server"});
                  return;
                } 
                else {

                  namespaces[data.name] = client;
                  namespaces[data.name].emit('register_success', {"name": data.name});
              
                  if(data.type == "subscriber") {  
                    var message = new Messages({
                    user : data.name,
                    msgqueue : []
                });
           
                message.save(function(err) {
                  if (err) throw err;
                  console.log("message queue ready for current user");
                });

              } else {
                 console.log("new publisher registered" + data.name);
              }
           }
          });

          });



					
    });

    client.on('list_publishers', function(data){


    		var userName = data.user;
    		var listData = {};
        listData.user = userName;
    		User.find({ type: 'publisher' } , 'description', function(err, ac) {
  				
          if (err) throw err;
  				console.log(ac);
          var lD = {};
          var channels = [];
          if(ac.length > 0) {
            
            for(var i=0; i < ac.length; i++) {
              lD[ac[i].description] = i;
            }

            for(key in lD) {
              channels.push({'description' : key});
            }

          }

  				listData.allchannels = channels;
          console.log("fetch pubs for " + userName);

  				PubSub.find({subs: userName}, 'topics', function(err, subsdata){
            if (err) throw err;
            console.log(subsdata);
            listData.currentsubs = subsdata;
            namespaces[userName].emit('fetch_list_success', listData);
          });

				});

       

    });

     client.on('update_pub_sub', function(data){

        console.log(JSON.stringify(data));
        var register = new PubSub({
              topics: data.topics,
              subs: data.subs,
        });

        register.save(function(err) {
            if (err) throw err;
            namespaces[data.subs].emit('pub_sub_update_success', {"name": data.topics});
          });

        });

    client.on('get_old_messages', function(data){

         console.log("fetch messages for ..." + JSON.stringify(data));
          Messages.find({user: data.user}, 'msgqueue', function(err, msgdata){
              if (err) throw err;
              if(msgdata.length > 0) {
                var messages = msgdata[0].msgqueue;
                messages.sort(function(a, b) {
                 return parseInt(a.id) - parseInt(b.id);
                });
                console.log(messages);
                namespaces[data.user].emit('show_old_messages', {user : data.user, msgq: messages});
              }
          });

    }); 

     client.on('subscribe', function(data) {
     			console.log("new message received " + JSON.stringify(data));
    			var register = new User({
  						name: data.name,
  						password: data.password,
  						type: data.type,
  						description: data.description 
					});

					register.save(function(err) {
  					if (err) throw err;
  					namespaces[data.name].emit('register_success', 'User registered successfully!');
           
					});
    });


     client.on('publish_post', function(data) {

          User.find({ name: data.publisher },'description', function(err, description) { 

            console.log(description);
            PubSub.find({topics: description[0].description}, 'subs', function(err, subsdata){
            if (err) throw err;
            console.log(subsdata);

            if(subsdata.length == 0) {
              client.emit('message_post_failure', {"status" : "no subscribers available"});
            } else {

            for(var i=0;i < subsdata.length; i++) {
              var username = subsdata[i].subs;
              console.log(username);
              Messages.update({user : username}, {$push: {"msgqueue": data.message}}, {upsert:true}, function(err, model) {
                  if(err){
                    console.log(err);
                    namespaces[data.publisher].emit('message_post_failure', {"status" : "message posting failed"});
                  }else {
                    console.log("message pushed successfully");
                    
                  }
                  
              });

                console.log("message for " + username);
                if(namespaces.hasOwnProperty(username)){
                   namespaces[username].emit('new_message_available', {"user": username, "message" : data.message});
                }

            }

            namespaces[data.publisher].emit('message_post_success', {"status" : "OK"});
          }
          
          });

          });


          

    });



    client.on('get_all_messages', function(data) {
          
          console.log("fetch messages for ..." + JSON.stringify(data));
          Messages.find({user: data.user}, 'msgqueue', function(err, msgdata){
              if (err) throw err;
              var messages = msgdata[0].msgqueue;
              messages.sort(function(a, b) {
                 return parseInt(a.id) - parseInt(b.id);
              });
              console.log(messages);
          });

    });

    client.on('get_new_messages', function(data) {

          console.log(namespaces);
          
          console.log("fetch messages for ..." + JSON.stringify(data));
          Messages.find({user: data.user}, 'msgqueue', function(err, msgdata){
              if (err) throw err;
              var messages = msgdata[0].msgqueue;
              messages.sort(function(a, b) {
                 return parseInt(a.id) - parseInt(b.id);
              });
              console.log(messages);
          });

    });
 


});

server.listen(3000);  


