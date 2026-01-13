import mongoose from 'mongoose';
import CryptoJS from 'crypto-js';

const credentialSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['server', 'database', 'api', 'email', 'social_media', 'cloud_service', 'other']
  },
  url: {
    type: String
  },
  username: {
    type: String
  },
  encryptedPassword: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  accessibleBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  accessibleByRoles: [{
    type: String,
    enum: ['admin', 'manager', 'employee']
  }],
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastAccessedBy: {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  expiryDate: {
    type: Date
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

credentialSchema.index({ title: 1 });
credentialSchema.index({ category: 1 });
credentialSchema.index({ project: 1 });
credentialSchema.index({ isActive: 1 });

credentialSchema.methods.encryptPassword = function(password) {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('Encryption key not configured');
  }
  this.encryptedPassword = CryptoJS.AES.encrypt(password, encryptionKey).toString();
};

credentialSchema.methods.decryptPassword = function() {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('Encryption key not configured');
  }
  const bytes = CryptoJS.AES.decrypt(this.encryptedPassword, encryptionKey);
  return bytes.toString(CryptoJS.enc.Utf8);
};

credentialSchema.methods.hasAccess = function(userId, userRole) {
  if (userRole === 'admin') return true;

  if (this.accessibleByRoles && this.accessibleByRoles.includes(userRole)) {
    return true;
  }

  if (this.accessibleBy && this.accessibleBy.some(id => id.toString() === userId.toString())) {
    return true;
  }

  return false;
};

const Credential = mongoose.model('Credential', credentialSchema);

export default Credential;
