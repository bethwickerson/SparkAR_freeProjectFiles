/**
 * (c) Meta Platforms, Inc. and affiliates. Confidential and proprietary.
 */

// How to load in modules
const Diagnostics = require('Diagnostics');
const Patches = require('Patches');
const Persistence = require('Persistence');

(async function () {

  // To access scene objects
  const [scorePulse, gameOver] = await Promise.all([
    Patches.outputs.getPulse('scorePulse'),
    Patches.outputs.getPulse('gameOver')
  ]);

  let score = 0;
  let highScore = 0;
  let updatedScoreText = "THANKS FOR PLAYING!";
  Patches.inputs.setString('TIMEUP_MESSAGE', updatedScoreText);

 // Store a reference to the local storage location
  const localStorage = Persistence.local;

  try {
    highScore = await localStorage.get('highScore');

    if (highScore) {
      Diagnostics.log("Saved High Score: " + highScore.value);
      Patches.inputs.setScalar('HIGH_SCORE', highScore.value);
      Patches.inputs.setBoolean('SHOW_HIGH_SCORE', true);
    } else {
      Diagnostics.log("No saved score: " + highScore);
    }
  } catch (error) {
    Diagnostics.log("Error: " + error);
  }

  // MAX SCORE
  function scorePoints() {
    score++;

    Diagnostics.log('scorePulse: ' + score);
    Patches.inputs.setScalar('CURRENT_SCORE', score);
  }


  // SAVE HIGH SCORE
  function saveHighScore() {

    // set the score message based on the comparison 
    // between the high score and current score
    if (highScore && highScore.value > score) {
      updatedScoreText = "BETTER LUCK NEXT TIME!";
      Diagnostics.log("Current score: " + score);
      Diagnostics.log("High score: " + highScore.value);
    } else {
      Persistence.userScope.set('highScore', { value: score });
      updatedScoreText = "NEW HIGH SCORE!";
    }

    Diagnostics.log("Game over score: " + score);
    Diagnostics.log("Message: " + updatedScoreText);
    Patches.inputs.setString('TIMEUP_MESSAGE', updatedScoreText);
  }

  scorePulse.subscribe(scorePoints);
  gameOver.subscribe(saveHighScore);

})(); // Enables async/await in JS [part 2]
