const { randomUUID } = require('crypto');
const mongoose = require('mongoose');

const { Schema } = mongoose;

const doubtSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => randomUUID()
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300
    },
    description: {
      type: String,
      required: true
    },
    category: {
      type: String,
      required: true,
      trim: true
    },
    tags: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: ['open', 'answered', 'resolved'],
      default: 'open'
    },
    views: {
      type: Number,
      default: 0
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
    }
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

doubtSchema.index({ userId: 1, status: 1 });
doubtSchema.index({ category: 1, status: 1 });
doubtSchema.index({ createdAt: 1 });

module.exports = mongoose.model('Doubt', doubtSchema);
