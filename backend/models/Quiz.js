const { randomUUID } = require('crypto');
const mongoose = require('mongoose');

const { Schema } = mongoose;

const optionSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => randomUUID()
    },
    text: {
      type: String,
      required: true
    },
    isCorrect: {
      type: Boolean,
      default: false
    }
  },
  { versionKey: false }
);

const questionSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => randomUUID()
    },
    questionText: {
      type: String,
      required: true
    },
    options: {
      type: [optionSchema],
      default: []
    },
    explanation: {
      type: String,
      default: ''
    },
    points: {
      type: Number,
      default: 1
    }
  },
  { versionKey: false }
);

const quizSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => randomUUID()
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    description: {
      type: String,
      default: '',
      maxlength: 1000
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      required: true
    },
    questions: {
      type: [questionSchema],
      default: []
    },
    isPublic: {
      type: Boolean,
      default: false
    },
    timeLimit: {
      type: Number,
      default: 0
    },
    totalAttempts: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    userId: {
      type: String,
      ref: 'User',
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

quizSchema.index({ userId: 1, category: 1 });
quizSchema.index({ isPublic: 1, category: 1 });

module.exports = mongoose.model('Quiz', quizSchema);
