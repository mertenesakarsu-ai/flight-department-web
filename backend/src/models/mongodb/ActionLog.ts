import mongoose, { Document, Schema } from 'mongoose';

export interface IActionLog extends Document {
  userId: string;
  username: string;
  actionType: string;
  detail: any;
  createdAt: Date;
}

const ActionLogSchema = new Schema<IActionLog>(
  {
    userId: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    actionType: {
      type: String,
      required: true,
    },
    detail: {
      type: Schema.Types.Mixed,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

ActionLogSchema.index({ createdAt: -1 });
ActionLogSchema.index({ userId: 1 });
ActionLogSchema.index({ actionType: 1 });

export const ActionLog = mongoose.model<IActionLog>('ActionLog', ActionLogSchema);

