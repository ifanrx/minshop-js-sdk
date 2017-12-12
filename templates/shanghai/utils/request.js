import Auth from './auth';
import Config from './config';
import Constants from './constants';
import Storage from './storage';
import Utils from './utils';
import { Promise } from './rsvp';

const authResolve = [];
let isAuthing = false;

let mchid = Config.WX_EXT['HTTP_X_PEPE_MERCHANT_ID'] || null;

/**
 * 未登录时将请求暂存，当登录成功后再发起所有请求
 * @return {Object}  返回一个 Promise 对象
 */
const auth = (oldSessionKey) => {
  const sessionkey = Storage.get(Constants.STORAGE_KEY.SESSION_KEY);

  if (!oldSessionKey && sessionkey) {
    return new Promise((resolve, reject) => {
      resolve(sessionkey);
    });
  }

  if (isAuthing) {
    return new Promise((resolve, reject) => {
      authResolve.push(resolve);
    });
  }

  isAuthing = true;

  return Auth.init(oldSessionKey).then(() => {
    setTimeout(() => {
      while (authResolve.length) {
        authResolve.shift()();
      }
    }, 0);
    return new Promise((resolve, reject) => {
      resolve();
    });
  }).catch(err => {
    throw new Error(err);
  });
};

/**
 * 全局网络请求入口
 * @param  {String} url                   url地址
 * @param  {String} [method='GET']        请求方法
 * @param  {Object|String} data           请求参数
 * @param  {Object} header                请求头部
 * @param  {String} [dataType='json']     发送数据的类型
 * @return {Object}                       返回一个 Promise 对象
 */
const request = ({ url, method = 'GET', data = {}, header = {}, dataType = 'json' }) => {
  return new Promise((resolve, reject) => {
    if (Utils.hasSessionkeyURL(url)) {
      const authorized = Storage.get(Constants.STORAGE_KEY.AUTHORIZED);
      if (authorized === 'false' && url.indexOf('shopping_cart') == -1) {
        wx.hideToast();
        wx.showModal({
          content: Config.WX_EXT.MERCHANT_NAME + '需要您的授权才能正常使用该功能',
          success: (res) => {
            if (res.confirm) {
              if (wx.openSetting) {
                wx.openSetting({
                  success: (res) => {
                    if (res.authSetting['scope.userInfo']) {
                      Storage.set(Constants.STORAGE_KEY.AUTHORIZED, 'true');
                      wx.showToast({
                        icon: 'loading',
                        duration: 10000
                      });
                      requestWithAuth({ url, method, data, header, dataType }).then(res => {
                        resolve(res);
                      }).catch(err => {
                        reject(err);
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
        return;
      }

      return requestWithAuth({ url, method, data, header, dataType }).then(res => {
        resolve(res);
      }).catch(err => {
        reject(err);
      });
    } else {
      return requestController({ url, method, data, header, dataType }).then(res => {
        resolve(res);
      }).catch(err => {
        reject(err);
      });
    }
  });
};

/**
 * 全局网络请求处理函数，主要对 URL 和 data 进行处理
 * @return {Object}  返回一个 Promise 对象
 */
const requestController = ({ url, method, data, header, dataType }) => {
  return new Promise((resolve, reject) => {
    const HTTPMethodCodeMap = {
      GET: Constants.STATUS_CODE.SUCCESS,
      POST: Constants.STATUS_CODE.CREATED,
      PUT: Constants.STATUS_CODE.UPDATE,
      PATCH: Constants.STATUS_CODE.PATCH,
      DELETE: Constants.STATUS_CODE.DELETE
    };

    const originURL = url;

    url = Utils.formatURL(originURL, data);
    data = Utils.excludeParams(originURL, data);

    data.sessionkey = Storage.get(Constants.STORAGE_KEY.SESSION_KEY);
    if (data.sessionkey) {
      header['AUTHORIZATION'] = 'Bearer ' + data.sessionkey;
    }
    return baseRequest({ url, method, data, header, dataType }).then(res => {
      if (HTTPMethodCodeMap[method].indexOf(res.statusCode) !== -1) {
        resolve(res);
      } else {
        reject(res);
      }
    }).catch(err => {
      reject(err);
    });
  });
};

/**
 * 基础网络请求函数
 * @param  {String} url                   url地址
 * @param  {String} [method='GET']        请求方法
 * @param  {Object|String} data           请求参数
 * @param  {Object} header                请求头部
 * @param  {String} [dataType='json']     发送数据的类型
 * @return {Object}                       返回一个 Promise 对象
 */
const baseRequest = ({ url, method = 'GET', data = {}, header = {}, dataType = 'json' }) => {
  return new Promise((resolve, reject) => {
    if (!/(https|http):\/\//.test(url)) {
      url = Config.API_HOST + url;
    }

    let extHeader = {}
    if (mchid) {
      extHeader['X-PEPE-MERCHANT-ID'] = mchid;

      if (method === 'GET') {
        if (url.indexOf('?') > -1) {
          url += '&merchant_id=' + mchid;
        } else {
          url += '?merchant_id=' + mchid;
        }
      }
    }

    wx.request({
      method: method,
      url: url,
      data: data,
      header: Object.assign({}, header, extHeader),
      dataType: dataType,
      success: res => {
        const authorized = Storage.get(Constants.STORAGE_KEY.AUTHORIZED);
        if (res.statusCode == Constants.STATUS_CODE.UNAUTHORIZED && authorized !== 'false') {
          const oldSessionKey = Storage.get(Constants.STORAGE_KEY.SESSION_KEY);

          // 先重新登录再请求数据
          return requestWithAuth({ url, method, data, header, dataType, oldSessionKey }).then(res => {
            resolve(res);
          }).catch(err => {
            reject(err);
          });
        } else {
          resolve(res);
        }
      },

      fail: err => {
        reject(err);
      }
    });

    console.log('Request => ' + url);
  });
};

/**
 * 处理带有 sessionkey 的网络请求，确保登录成功后再发起请求
 * @return {Object}  返回一个 Promise　对象
 */
const requestWithAuth = ({ url, method, data, header, dataType, oldSessionKey }) => {
  return new Promise((resolve, reject) => {
    return auth(oldSessionKey).then(() => {
      isAuthing = false;

      data.sessionkey = Storage.get(Constants.STORAGE_KEY.SESSION_KEY);
      return requestController({ url, method, data, header, dataType });
    }).then(res => {
      resolve(res);
    }).catch(err => {
      reject(err);
    });
  });
};

module.exports = {
  request,
  baseRequest
};
