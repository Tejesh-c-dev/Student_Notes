const { randomUUID } = require('crypto');
const mongoose = require('mongoose');

const { Schema } = mongoose;

const bookmarkSchema = new Schema(
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
    }
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// A user can bookmark a note at most once.
bookmarkSchema.index({ userId: 1, noteId: 1 }, { unique: true });

module.exports = mongoose.model('Bookmark', bookmarkSchema);
