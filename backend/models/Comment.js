const { randomUUID } = require('crypto');
const mongoose = require('mongoose');

const { Schema } = mongoose;

const commentSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => randomUUID()
    },
    noteId: {
      type: String,
      ref: 'Note',
      required: true,
      index: true
    },
    userId: {
      type: String,
      ref: 'User',
      required: true,
      index: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Comments are always fetched per note (never across notes), so the noteId
// prefix drives the query and createdAt keeps the listing in order.
commentSchema.index({ noteId: 1, createdAt: 1 });

module.exports = mongoose.model('Comment', commentSchema);
