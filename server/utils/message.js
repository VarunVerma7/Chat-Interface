var moment = require('moment');
var {Message} = require('../server.js');
var generateMessage = (from, text, time) => {
  if (!time) {
    return {
      from,
      text,
      createdAt: moment().valueOf()
    };
  } else {
    return {
      from,
      text,
      createdAt: moment(time)
    }
  }


};

var generateLocationMessage = (from, latitude, longitude) => {
  return {
    from,
    url: `https://www.google.com/maps?q=${latitude},${longitude}`,
    createdAt: moment().valueOf()
  };
};

module.exports = {
  generateMessage,
  generateLocationMessage
};
