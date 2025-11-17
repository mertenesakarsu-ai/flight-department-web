import mongoose, { Document, Schema } from 'mongoose';

export interface ILoginLog extends Document {
  userId: string;
  username: string;
  loginAt: Date;
  ip?: string;
  success: boolean;
}

const LoginLogSchema = new Schema<ILoginLog>(
  {
    userId: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      required: true,
    },
    loginAt: {
      type: Date,
      default: Date.now,
    },
    ip: {
      type: String,
    },
    success: {
      type: Boolean,
      required: true,
    },
  },
  {
    timestamps: false,
  }
);

LoginLogSchema.index({ loginAt: -1 });
LoginLogSchema.index({ userId: 1 });

export const LoginLog = mongoose.model<ILoginLog>('LoginLog', LoginLogSchema);

