const path = require('path');
const _ = require('lodash');
const http = require('http');
const express = require('express');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const {generateMessage, generateLocationMessage} = require('./utils/message');
const {isRealString} = require('./utils/validation');
const {Users} = require('./utils/users');
const publicPath = path.join(__dirname, '../public');
const port = process.env.PORT || 3000;
const {userExists} = require('./utils/userExists.js');
var moment = require('moment');

var {addToRoomList} = require('./utils/roomList.js');
var app = express();
var server = http.createServer(app);
var io = socketIO(server);
var users = new Users();
var rooms = [];
mongoose.Promise = global.Promise;
mongoose.connect('mongodb://localhost:27017/MessageSaver');

var messageSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  }
});

app.use(express.static(publicPath));

io.on('connection', (socket) => {


  socket.on('join', (params, callback) => {
    if (!isRealString(params.name) || !isRealString(params.room)) {
      return callback('Name and room name are required.');
    }

    params.room = params.room.toUpperCase();

    socket.join(params.room);
    if (!(rooms.includes(params.room))) {
      rooms.push(params.room)
    }


    // Dont let users use a name thats taken
    var usernames = users.getUserList(params.room);
    for (var i = 0; i < usernames.length; i++) {
      if (usernames[i] === params.name) {
        return callback('Name already taken');
      }
    }
    users.removeUser(socket.id);
    users.addUser(socket.id, params.name, params.room);


    io.to(params.room).emit('updateUserList', users.getUserList(params.room));



    socket.emit('newMessage', generateMessage('Admin', 'Welcome to the chat app'));


    socket.broadcast.to(params.room).emit('newMessage', generateMessage('Admin', `${params.name} has joined.`));
    callback();
  });

  socket.on('createMessage', (message, callback) => {
    var user = users.getUser(socket.id);

    if (user && isRealString(message.text)) {
      io.to(user.room).emit('newMessage', generateMessage(user.name, message.text));

      var Message = mongoose.model(user.room, messageSchema, user.room);
      // console.log(user.room);
      var newMessage = new Message({
        username: user.name,
        time: moment().format('h:mm a'),
        message: message.text
      });
      // mongoose.model(`${user.room}`, messageSchema).find({}).then((db) => {
      //   db.map((doc) => {
      //     socket.emit('newMessage', generateMessage(doc.username, doc.message));
      //   })
      // });
      mongoose.model(`${user.room}`, messageSchema).find({}).then((db) => {
        console.log(db);
        db.map((doc) => {
          socket.emit('newMessage', generateMessage(doc.username, doc.message));
        })
      });
      newMessage.save().then((message) => {
        // console.log('message saved')
      }, (e) => {
        console.log(e);
      });


    }

    callback();
  });

  socket.on('createLocationMessage', (coords) => {
    var user = users.getUser(socket.id);

    if (user) {
      io.to(user.room).emit('newLocationMessage', generateLocationMessage(user.name, coords.latitude, coords.longitude));
    }
  });

  socket.on('disconnect', () => {
    var user = users.removeUser(socket.id);

    if (user) {
      io.to(user.room).emit('updateUserList', users.getUserList(user.room));
      io.to(user.room).emit('newMessage', generateMessage('Admin', `${user.name} has left.`));
    }
  });
});

server.listen(port, () => {
  console.log(`Server is up on ${port}`);
});

module.exports = {
  users,
  rooms
}
