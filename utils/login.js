var CONFIG = require('config.js');

module.exports = {

  /**
   * 获取微信用户登录信息
   */
  getUserInfo: function () {
    var that = this;
    wx.getUserInfo({
      success: function (res) {
        // 获取用户信息后走验证流程
        that.verifyUser(res);
        wx.setStorageSync('authorized', 'true');
      },
      fail: function () {
        wx.setStorageSync('authorized', 'false');
        that.failback && that.failback();
      }
    });
  },
  /**
   * 验证用户
   * @param  {Object} userInfo 微信登录用户信息
   */
  verifyUser: function (res) {
    var that = this;

    wx.request({
      method: 'POST',
      url: CONFIG.API_URL.LOGIN_VERIFY_URL,
      data: {
        signature: res.signature,
        raw_data: res.rawData,
        encrypted_data: res.encryptedData,
        iv: res.iv,
        open_id: that.openId
      },
      success: function (json) {
        if (json.statusCode == 201) {
          wx.setStorageSync('session_key', json.data.session_key);

          that.callback && that.callback();
        }
      }
    })
  },

  init: function (cb, fcb) {
    var that = this;

    var loginedUserInfo = wx.getStorageSync('userinfo');
    // 已登录或者 debug 模式不需要走登录流程
    if (loginedUserInfo || CONFIG.debug) {
      cb && cb();
    } else {
      that.callback = cb;
      that.failback = fcb;
      // 走登录流程
      wx.login({
        success: function (res) {
          if (res.code) {
            //发起网络请求
            wx.request({
              method: 'POST',
              url: CONFIG.API_URL.LOGIN_URL,
              data: {
                js_code: res.code
              },
              success: function (json) {

                if (json.statusCode == 200) {
                  var openId = json.data.openid;

                  that.openId = openId;

                  // 通过微信 API 获取用户信息
                  that.getUserInfo();
                }
              }
            })
          } else {
            that.failback && that.failback();
            console.log("获取用户登录状态失败！" + res.errMsg);
          }
        },
        fail: function (res) {
          that.failback && that.failback();
          console.log('login fail')
        }
      });

    }

  }
}
