import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  role: 'admin' | 'member';
  profilePicture?: string;
  isActive: boolean;
  isVerified: boolean;
  verificationToken?: string;
  verificationTokenExpire?: Date;
  joinDate: Date;
  comparePassword(enteredPassword: string): Promise<boolean>;
}

// Alias for consistency with other files
export type UserDocument = IUser;

const UserSchema: Schema = new Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Please add a name'],
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    phone: {
      type: String,
      required: [true, 'Please add a phone number'],
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member',
    },
    profilePicture: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    verificationTokenExpire: Date,
    joinDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Encrypt password using bcrypt
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  // Ensure this.password is a string
  this.password = await bcrypt.hash(this.password as string, salt);
});

// Match user entered password to hashed password in database
UserSchema.methods.comparePassword = async function (enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model<IUser>('User', UserSchema);
