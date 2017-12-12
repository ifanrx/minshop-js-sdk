module.exports = {
  set: (key, value) => {
    try {
      wx.setStorageSync(key, value);
    } catch (e) {
      throw new Error(e);
    }
  },
  get: key => {
    try {
      return wx.getStorageSync(key);
    } catch (e) {
      throw new Error(e);
    }
  }
};
