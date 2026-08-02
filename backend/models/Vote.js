const { randomUUID } = require('crypto');
const mongoose = require('mongoose');

const { Schema } = mongoose;

const voteSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => randomUUID()
    },
    targetId: {
      type: String,
      required: true,
      index: true
    },
    targetType: {
      type: String,
      enum: ['doubt', 'answer'],
      required: true
    },
    voteType: {
      type: String,
      enum: ['up', 'down'],
      required: true
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

voteSchema.index({ userId: 1, targetId: 1, targetType: 1 }, { unique: true });
voteSchema.index({ targetId: 1, targetType: 1 });

module.exports = mongoose.model('Vote', voteSchema);
