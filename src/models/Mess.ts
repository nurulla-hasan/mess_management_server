import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMess extends Document {
  name: string;
  managerId: Types.ObjectId; // The primary admin who created the mess
  address?: string;
  phone?: string;
  inviteCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const messSchema = new Schema<IMess>(
  {
    name: {
      type: String,
      required: [true, 'Mess name is required'],
      trim: true,
    },
    managerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    address: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    inviteCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Mess = mongoose.model<IMess>('Mess', messSchema);
export default Mess;
