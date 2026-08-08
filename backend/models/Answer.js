const { randomUUID } = require('crypto');
const mongoose = require('mongoose');

const { Schema } = mongoose;

const answerSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => randomUUID()
    },
    content: {
      type: String,
      required: true
    },
    isAccepted: {
      type: Boolean,
      default: false
    },
    upvotes: {
      type: Number,
      default: 0
    },
    downvotes: {
      type: Number,
      default: 0
    },
    userId: {
      type: String,
      ref: 'User',
      required: true,
      index: true
    },
    doubtId: {
      type: String,
      ref: 'Doubt',
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

answerSchema.index({ doubtId: 1, isAccepted: 1 });

module.exports = mongoose.model('Answer', answerSchema);
