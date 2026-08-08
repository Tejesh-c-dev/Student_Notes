const User = require('./user');
const Note = require('./Note');
const Quiz = require('./Quiz');
const QuizAttempt = require('./QuizAttempt');
const Doubt = require('./Doubt');
const Answer = require('./Answer');
const Vote = require('./Vote');
const PYQ = require('./PYQ');

const models = {
  User,
  Note,
  Quiz,
  QuizAttempt,
  Doubt,
  Answer,
  Vote,
  PYQ
};

module.exports = {
  ...models
};
