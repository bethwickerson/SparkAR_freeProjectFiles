// // In this snippet we are going to set a boolean value based on the time of day.

// // originally sourced from https://jsfiddle.net/sun21170/d3sdxwpb/1/

// // Project requirements:
// // FromScript boolean labeled  "nightMode".

// // Import Spark AR Modules
// const P = require('Patches');
// const D = require('Diagnostics');


// (async function () {

//   // Create a function to calculate sunset
//   function calculateSunset() {

//     // Create a new Date object for our event with the year from today's date 
//     var dt = new Date(Date.now());

//     var startTime = '06:00:00';
//     var endTime = '19:00:00';

//     var s =  startTime.split(':');
//     var dt1 = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), parseInt(s[0]), parseInt(s[1]), parseInt(s[2]));

//     var e =  endTime.split(':');
//     var dt2 = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(),parseInt(e[0]), parseInt(e[1]), parseInt(e[2]));

//     let sunsetHour = false;
//     sunsetHour =  (dt >= dt1 && dt <= dt2) ? false: true;

  
//     P.inputs.setBoolean('nightMode', sunsetHour);
//     D.log("Is it night time? " + sunsetHour);
//   }
//   // Envoke our function
//   calculateSunset();

// })();