const { randomUUID } = require('crypto');
const mongoose = require('mongoose');

const { Schema } = mongoose;

const noteSchema = new Schema(
  {
    _id: {
      type: String,
      default: () => randomUUID()
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      default: null
    },
    fileUrl: {
      type: String,
      default: null
    },
    fileType: {
      type: String,
      default: null
    },
    attachmentType: {
      type: String,
      enum: ["upload", "external"],
      default: "upload"
    },
    visibility: {
      type: String,
      enum: ["private", "public"],
      default: "private",
      index: true
    },
    extractedText: {
      type: String,
      default: null
    },
    // Denormalized social counters kept in sync by the like/bookmark/comment
    // handlers so list and detail reads never have to count social rows.
    likeCount: {
      type: Number,
      default: 0,
      min: 0
    },
    bookmarkCount: {
      type: Number,
      default: 0,
      min: 0
    },
    commentCount: {
      type: Number,
      default: 0,
      min: 0
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

module.exports = mongoose.model('Note', noteSchema);