import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  description: {
    type: String
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Default settings
const DEFAULT_SETTINGS = {
  officeStartTime: '10:00',
  officeEndTime: '18:00',
  workingHoursPerDay: 8,
  workingDaysPerMonth: 22,
  lateGracePeriodMinutes: 15,
  overtimeRateMultiplier: 1.5,
  currency: 'PKR'
};

settingsSchema.statics.getSetting = async function(key) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : DEFAULT_SETTINGS[key];
};

settingsSchema.statics.setSetting = async function(key, value, userId) {
  return await this.findOneAndUpdate(
    { key },
    { value, updatedBy: userId },
    { upsert: true, new: true }
  );
};

settingsSchema.statics.getAllSettings = async function() {
  const settings = await this.find({});
  const result = { ...DEFAULT_SETTINGS };
  settings.forEach(s => {
    result[s.key] = s.value;
  });
  return result;
};

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;
