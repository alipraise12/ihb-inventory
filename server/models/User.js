const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['owner', 'staff'],
    default: 'owner',
  },
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null, // Set to null for shop owners; staff accounts reference the owner's ObjectId
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

/**
 * Helper Instance Method:
 * Returns the effective Shop/Owner ID for database queries.
 * - If the user is an owner, it returns their own _id.
 * - If the user is a staff member, it returns their linked shopId.
 */
UserSchema.methods.getEffectiveShopId = function () {
  return this.role === 'owner' ? this._id : this.shopId;
};

module.exports = mongoose.model('User', UserSchema);