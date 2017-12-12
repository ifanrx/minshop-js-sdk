import Config from './config';
import { Promise } from './rsvp';

const WindowWidth = wx.getSystemInfoSync().windowWidth;

module.exports = {
  /**
   * 对象深拷贝
   * @param  {Object} data 拷贝目标对象
   * @return {object}      拷贝完成的对象
   */
  deepClone(data) {
    let i, len, obj;
    let type = Object.prototype.toString.call(data);

    if (type === '[object Array]') {
      obj = [];
    } else if (type === '[object Object]') {
      obj = {};
    } else {
      return data;
    }

    if (type === '[object Array]') {
      for (i = 0, len = data.length; i < len; i++) {
        obj.push(this.deepClone(data[i]));
      }
      return obj;
    } else if (type === '[object Object]') {
      for (i in data) {
        obj[i] = this.deepClone(data[i]);
      }
      return obj;
    }
  },

  isObjEmpty(obj) {
    if (obj) {
      for (var i in obj) {
        return false;
      }
    }
  
    return true;
  },

  rpx2px(width) {
    const windowWidth = WindowWidth;
    const ratio = Math.round((windowWidth / 750) * 100) / 100;
    return width * ratio;
  },

  px2rpx(width) {
    const windowWidth = WindowWidth;
    const ratio = Math.round((width / windowWidth) * 100) / 100;
    return ratio * 750;
  },

  /**
   * URL 中是否有 sessionkey，若有，则说明该 API 要先登录才能正常请求
   * @param  {String}   URL  API URL
   * @return {Boolean}       URL 中有 sessionkey 时 返回 true
   */
  hasSessionkeyURL(URL) {
    return URL.search(/:sessionkey/) !== -1;
  },

  /**
   * 转换 API 参数
   * @param  {String} URL    API URL
   * @param  {Object} params API 参数
   * @return {String}        转换参数后的 API URL
   */
  formatURL(URL, params) {
    const hasSessionkeyURL = this.hasSessionkeyURL(URL);
    params = params || {};
    for (let key in params) {
      if (key !== 'sessionkey') {
        let reg = new RegExp(':' + key + '/', 'g');
        URL = URL.replace(reg, params[key] + '/');
      } else {
        URL = URL.replace(/:sessionkey\//, '?sessionkey=' + params[key]);
      }
    }

    if (!hasSessionkeyURL) {
      URL = URL.replace(/([^:])\/\//g, (m, m1) => {
        return m1 + '/';
      });
    }

    return URL;
  },

  /**
   * 把 URL 中用于 format URL 的参数移除掉
   * 开启 DEBUG 时移除 img_size 参数，保证本地图片正常显示
   * @param  {String} URL    URL 链接
   * @param  {Object} params 参数对象
   * @return {Object}
   */
  excludeParams(URL, params) {
    URL.replace(/:(\w*)\//g, (match, m1) => {
      if (params[m1] !== undefined) {
        delete params[m1];
      }
    });

    if (Config.DEBUG) {
      delete params.img_size;
    }

    return params;
  },

  /**
   * 商品列表价格处理函数，数字类型转换，并判断当前商品是否有折扣 hasDiscount
   * @param  {Array} productList 商品列表
   * @return {Array}             处理后的商品列表
   */
  formatePrices(productList) {
    productList.forEach((item, index, array) => {
      item.price = Number(item.price);
      item.original_price = Number(item.original_price);
      item.hasDiscount = item.original_price > item.price;
    });

    return productList;
  },

  /**
   * 给每个 banner 添加商品 URL，舍弃没有商品详情或货架链接的 banner
   * 也适用于专题商品列表（小 banner）
   * @param {Array} banners
   */
  addProductURLtoBanners: banners => {
    banners.forEach(item => {
      const shelfReg = /\/shelf\/(\d+)/;
      const detailReg = /\/detail\/(\d+)/;
      const branchReg = /\/fair\/branch\/(\d+)/;
      const vendorReg = /\/vendor\/(\d+)/;
      const mainReg = /\/fair\/main\//;

      let targetReg = detailReg;

      let preURL;
      let matchRes;
      let productId;

      if (!item.target_url) {
        return
      }

      if (item.target_url.search(detailReg) !== -1) {
        preURL = Config.ROUTE.DETAIL + '?id=';
      } else if (item.target_url.search(shelfReg) !== -1) {
        targetReg = shelfReg;
        preURL = Config.ROUTE.LIST + '?id=';
      } else if (item.target_url.search(branchReg) !== -1) {
        targetReg = branchReg;
        preURL = Config.ROUTE.ACTIVITY + '?id=';
      } else if (item.target_url.search(vendorReg) !== -1) {
        targetReg = vendorReg;
        preURL = Config.ROUTE.BRAND + '?id=';
      } else if (item.target_url.search(mainReg) !== -1) {
        targetReg = mainReg;
        preURL = Config.ROUTE.VENUE + '?id=';
        item.isVenue = true;
      }

      matchRes = item.target_url.match(targetReg);

      if (matchRes != null) {
        productId = matchRes[1];

        item.URL = preURL + productId;
      }
    });
  },

  /**
   * 过滤货架简介中的 html 标签
   * @param  {Array} data 传入货架数组
   * @return {Array}      处理后的货架数组
   */
  formateShelfsDescription(shelfList) {
    const regexp = /\<.+\>(.*)\<\/.+\>/;

    shelfList.forEach(item => {
      let description = item.description;
      if (description.search(regexp) !== -1) {
        item.description = description && description.match(regexp)[1];
      }
    });

    return shelfList;
  },

  /**
   * 格式化优惠券列表的可使用时间
   * @param  {Array} couponList 优惠券列表
   * @return {Array}            处理后的优惠券列表
   */
  formatCouponListValidTime(couponList) {
    couponList.forEach(item => {
      item.valid_from = this.formatTimestamp(item.valid_from, 'ymd');
      item.valid_until = this.formatTimestamp(item.valid_until, 'ymd');
    });
    return couponList;
  },

  /**
   * 转换 Date 对象
   * @param {Date} date
   * @returns {Object}
   */
  standardizedDate(date) {
    const stdDate = {},
      month = date.getMonth() + 1,
      day = date.getDate(),
      hour = date.getHours(),
      min = date.getMinutes();

    stdDate.year = date.getFullYear();
    stdDate.month = month > 9 ? month : '0' + month;
    stdDate.day = day > 9 ? day : '0' + day;
    stdDate.hour = hour > 9 ? hour : '0' + hour;
    stdDate.minute = min > 9 ? min : '0' + min;

    return stdDate;
  },

  /**
   * 格式化时间戳为相应时间字符串
   * @param {Number} stamp
   * @param {String} type
   * @return {String}
   */
  formatTimestamp(stamp, type) {
    let result;
    let date = new Date();

    date.setTime(parseInt(stamp, 10) * 1000);

    const stdDate = this.standardizedDate(date);

    switch (type) {
      case 'ymd':
        result = '' + stdDate.year + '-' + stdDate.month + '-' + stdDate.day;
        break;
      case 'hm':
        result = '' + stdDate.hour + ':' + stdDate.minute;
        break;
    }

    return result;
  },

  /**
   * 将相对路径转换为绝对路径
   * @param  {String} relRout 相对路径
   * @return {String}         绝对路径
   */
  transAbsRoute(relRout) {
    return relRout.replace(/(\.\.\/)/, '/pages/');
  },

  /**
   * 显示 loading 提示并设置超时
   * @param  {String} title Toast 的标题
   * @return {Number}       setTimeout ID
   */
  showLoadingToast(title) {
    wx.showToast({
      title: title,
      icon: 'loading',
      duration: 10000
    });

    let timeoutId = setTimeout(() => {
      wx.hideToast();
      clearTimeout(timeoutId);
    }, 9800);

    return timeoutId;
  },

  /**
   * 隐藏 loading 提示
   * @param  {Number} timeoutId
   * @param  {Object} modalObj  wx.showModal 配置
   */
  hideLoadingToast(timeoutId, modalObj) {
    this.delayHideToast(0, () => {
      if (modalObj) {
        wx.showModal(modalObj);
      }
    });
    clearTimeout(timeoutId);
  },

  /**
   * 延时隐藏 Totast
   * @param  {Number} delayTime 延时时间，单位毫秒，默认 800 ms
   */
  delayHideToast(delayTime, callback) {
    delayTime = delayTime != undefined ? delayTime : 800;

    setTimeout(() => {
      wx.hideToast();
      callback && callback();
    }, delayTime);
  },

  notSupportOpenSetting() {
    return new Promise((resolve, reject) => {
      let merchantName = Config.WX_EXT.MERCHANT_NAME
      wx.showModal({
        content: merchantName + '需要您的授权才能正常所有功能。若要授权，您可以先退出小程序 10 分钟后，再进入授权。或从底部栏“发现->小程序”，从列表中删除' +
        merchantName + '小程序，再重新搜索' +
        merchantName + '进入。',
        showCancel: false,
        success: res => {
          if (res.confirm) {
            wx.switchTab({
              url: Config.ROUTE.HOME
            });
            resolve();
          }
        }
      });
    });
  },

  toCent(price) {
    let str = String(price).split('.');
    let result = str[0];
    if (str.length > 1) {
      let part2 = str[1].slice(0, 2);
      if (part2.length === 1) {
        part2 += '0';
      }
      result += part2;
    } else {
      result += '00';
    }
    return parseInt(result, 10);
  },

  /**
   * 把错误的数据转正
   * strip(0.09999999999999998)=0.1
   */
  strip(num, precision = 12) {
    return +parseFloat(num.toPrecision(precision));
  },

  /**
   * 获取 mchid
   */
  processHeader(header = {}) {
    let mchid = Config.WX_EXT['HTTP_X_PEPE_MERCHANT_ID'] || null;

    if (mchid) {
      header['X-PEPE-MERCHANT-ID'] = mchid;
    }
    return header;
  },
}
