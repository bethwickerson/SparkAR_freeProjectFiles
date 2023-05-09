// In this snippet we are going to calculate 
// the number of days left until an upcoming month/day 
// and output the number into a string for a text object.


// Project requirements:
// FromScript scalar labeled  "daysUntilEvent".

// Import Spark AR Modules
const P = require('Patches');
const D = require('Diagnostics');


(async function () {

  // Get today's date according to local time *
  const today = new Date(Date.now());
  
  // Create a function to calculate the number of days left
  function calculateDays() {

    // COUNTDOWN
    const eventMonth = 10;
    const eventDay = 5;
    const eventHour = 7;

    // Create a new Date object for our event
    const countDownDate = new Date('2024', eventMonth, eventDay, eventHour);

    // Find the distance between now and the count down date
    const distance = countDownDate - today;

    // Time calculations for days
    let days = Math.ceil(distance / (1000 * 60 * 60 * 24));
    if (days < 10) {
      days = "0" + days;
    }

    // Time calculations for minutes
    let hours = Math.ceil((distance / (1000 * 60 * 60)) % 24);
    if (hours < 10) {
      hours = "0" + hours;
    }

    // Time calculations for minutes
    let minutes = Math.ceil((distance / 1000 / 60) % 60);
    if (minutes < 10) {
      minutes = "0" + minutes;
    }

    // and check our output in the Console
    D.log("Election countdown: " + days + " days, " + hours + " hours, " + minutes + " minutes");

    P.inputs.setString('daysUntilEvent', days.toString());
    // P.inputs.setString('hoursUntilEvent', hours.toString());
    // P.inputs.setString('minutesUntilEvent', minutes.toString());
  }
  // Envoke our function
  calculateDays();



  // Create a function to calculate sunset
  function calculateSunset() {

    let startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), '06', '00', '00');
    let endTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), '19', '00', '00');

    let sunsetHour = false;
    sunsetHour =  (today >= startTime && today <= endTime) ? false: true;

  
    P.inputs.setBoolean('nightMode', sunsetHour);
    D.log("Is it night time? " + sunsetHour);
  }
  // Envoke our function
  calculateSunset();

})();