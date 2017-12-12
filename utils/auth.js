import Config from './config';
import Constants from './constants';
import Storage from './storage';
import { Promise } from './rsvp';
import Utils from './utils';

let openId;
let mchid = Config.WX_EXT['HTTP_X_PEPE_MERCHANT_ID'] || null;

const isAuthorized = () => {
  return Storage.get(Constants.STORAGE_KEY.AUTHORIZED) === 'true';
};

const hasSessionkey = () => {
  return !!Storage.get(Constants.STORAGE_KEY.SESSION_KEY);
};

const init = (oldSessionKey) => {
  if (isAuthorized() && hasSessionkey() && !oldSessionKey) {
    return;
  }

  if (hasSessionkey()) {
    return getUserInfo().then(res => {
      return verifyUser(res, oldSessionKey);
    }).then(res => {
      Storage.set(Constants.STORAGE_KEY.AUTHORIZED, 'true');
    }).catch(err => {
      Storage.set(Contants.STORAGE_KEY.AUTHORIZED, 'false');
      return new Error(err);
    });
  }

  return login().then(res => {
    return jscodeAuth(res);
  }).then(res => {
    if (!res.data.token) {
      return getUserInfo().then(res => {
        return verifyUser(res, oldSessionKey);
      });
    } else {
      return res;
    }
  }).then(res => {
    Storage.set(Constants.STORAGE_KEY.AUTHORIZED, 'true');
    if (!Config.DEBUG) {
      Storage.set(Constants.STORAGE_KEY.SESSION_KEY, res.data.token);
    } else {
      Storage.set(Constants.STORAGE_KEY.SESSION_KEY, Config.LOCAL_SESSION_KEY);
    }
  }).catch(err => {
    Storage.set(Constants.STORAGE_KEY.AUTHORIZED, 'false');
    return new Error();
  });;
};

const login = () => {
  return new Promise((resolve, reject) => {
    wx.login({
      success: res => {
        const jsCode = res.code;
        if (jsCode) {
          resolve(jsCode);
        } else {
          reject();
        }
      },
      fail: err => {
        reject(err);
      }
    });
  });
};

const jscodeAuth = (jsCode) => {
  return new Promise((resolve, reject) => {
    if (Config.DEBUG) {
      Storage.set(Constants.STORAGE_KEY.SESSION_KEY, Config.LOCAL_SESSION_KEY);
      resolve({});
      return;
    }

    var header = {};
    if (mchid) {
      header['X-PEPE-MERCHANT-ID'] = mchid;
    }

    wx.request({
      method: 'POST',
      url: Config.API_HOST + Config.API.SESSION_INIT,
      header,
      data: {
        code: jsCode
      },
      success: res => {
        if (res.statusCode == 201) {
          if (!Config.DEBUG) {
            Storage.set(Constants.STORAGE_KEY.SESSION_KEY, res.data.token);
          } else {
            Storage.set(Constants.STORAGE_KEY.SESSION_KEY, Config.LOCAL_SESSION_KEY);
          }

          resolve(res);
        } else {
          reject();
        }
      },
      fail: err => {
        reject(err);
      }
    });
  });
};

const getUserInfo = () => {
  return new Promise((resolve, reject) => {
    wx.getUserInfo({
      success: res => {
        Storage.set(Constants.STORAGE_KEY.USERINFO, res.userInfo);
        resolve(res);
      },

      fail: err => {
        wx.hideToast();
        wx.showModal({
          content: Config.WX_EXT.MERCHANT_NAME + '需要您的授权才能正常使用该功能。',
          success(res) {
            if (res.confirm) {
              if (wx.openSetting) {
                wx.openSetting({
                  success: (res) => {
                    if (res.authSetting['scope.userInfo']) {
                      wx.showToast({
                        icon: 'loading',
                        duration: 10000
                      });
                      wx.getUserInfo({
                        success: res => {
                          Storage.set(Constants.STORAGE_KEY.USERINFO, res.userInfo);
                          Storage.set(Constants.STORAGE_KEY.AUTHORIZED, 'true');
                          resolve(res);
                        },
                        fail: (err) => {
                          reject();
                        }
                      });
                    } else {
                      reject();
                    }
                  }
                });
              } else {
                return Utils.notSupportOpenSetting().then(res => {
                  return new Error();
                });
              }
            } else {
              reject();
            }
          }
        });
      }
    });
  });
};

const verifyUser = (res, oldSessionKey) => {
  return new Promise((resolve, reject) => {
    if (Config.DEBUG) {
      resolve({});
      return;
    }

    var header = {};
    var SESSION_KEY = Storage.get(Constants.STORAGE_KEY.SESSION_KEY);
    if (SESSION_KEY) {
      header['AUTHORIZATION'] = 'Bearer ' + SESSION_KEY;
    }

    if (mchid) {
      header['X-PEPE-MERCHANT-ID'] = mchid;
    }

    const baseURL = Config.API_HOST + Config.API.SESSION_AUTHENTICATE;
    const decryptionURL = !oldSessionKey ? baseURL : baseURL + '?sessionkey=' + oldSessionKey;

    wx.request({
      method: 'POST',
      url: decryptionURL,
      header,
      data: {
        signature: res.signature,
        rawData: res.rawData,
        encryptedData: res.encryptedData,
        iv: res.iv
      },
      success: result => {
        if (result.statusCode == 201) {
          // 清除旧的登录信息
          // clearLoginInfo();
          resolve(result);
        } else {
          reject();
        }
      },
      fail: err => {
        reject(err);
      }
    })
  });
};

const clearLoginInfo = () => {
  Storage.set(Constants.STORAGE_KEY.SESSION_KEY, '');
  Storage.set(Constants.STORAGE_KEY.USER_PROFILE, '');
  Storage.set(Constants.STORAGE_KEY.AUTHORIZED, '');
};

module.exports = {
  init,
  clearLoginInfo
};
