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
    extractedText: {
      type: String,
      default: null
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