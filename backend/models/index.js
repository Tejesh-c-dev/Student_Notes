const User = require('./user');
const Note = require('./Note');
const Quiz = require('./Quiz');
const QuizAttempt = require('./QuizAttempt');
const Doubt = require('./Doubt');
const Answer = require('./Answer');
const Vote = require('./Vote');
const PYQ = require('./PYQ');
const Like = require('./Like');
const Bookmark = require('./Bookmark');
const Comment = require('./Comment');

const models = {
  User,
  Note,
  Quiz,
  QuizAttempt,
  Doubt,
  Answer,
  Vote,
  PYQ,
  Like,
  Bookmark,
  Comment
};

module.exports = {
  ...models
};
