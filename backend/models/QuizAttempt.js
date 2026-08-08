const { randomUUID } = require('crypto');
const mongoose = require('mongoose');

const { Schema } = mongoose;

const answerSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => randomUUID()
    },
    questionId: {
      type: String,
      required: true
    },
    selectedOptionId: {
      type: String,
      default: null
    },
    isCorrect: {
      type: Boolean,
      default: false
    },
    pointsEarned: {
      type: Number,
      default: 0
    }
  },
  { versionKey: false }
);

const quizAttemptSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => randomUUID()
    },
    answers: {
      type: [answerSchema],
      default: []
    },
    score: {
      type: Number,
      default: 0
    },
    totalPoints: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    },
    timeTaken: {
      type: Number,
      default: 0
    },
    status: {
      type: String,
      enum: ['in-progress', 'completed'],
      default: 'in-progress'
    },
    startedAt: {
      type: Date,
      default: Date.now
    },
    completedAt: {
      type: Date,
      default: null
    },
    userId: {
      type: String,
      ref: 'User',
      required: true,
      index: true
    },
    quizId: {
      type: String,
      ref: 'Quiz',
      required: true,
      index: true
    }
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

quizAttemptSchema.index({ userId: 1, quizId: 1 });
quizAttemptSchema.index({ userId: 1, status: 1 });
quizAttemptSchema.index({ quizId: 1, status: 1 });

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema);
