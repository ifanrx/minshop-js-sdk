import Config from './config';
import { ProductAction } from './ga.js';

const FAIL_TAG = 'fail';
const SUCCESS_TAG = 'success';

const App = getApp();

const payResult = (orderId, result) => {
  wx.redirectTo({
    url: '../payment-result/payment-result?orderId=' + orderId + '&result=' + result
  });
}

const payForGiftResult = (signedId) => {
  wx.redirectTo({
    url: '../gift/gift?source=pay&signedId=' + signedId + '&isShowGiftShareTip=true'
  });
}

const basePay = (orderId, callback) => {
  return App.request({
    url: Config.API.PAYMENT,
    method: 'POST',
    data: {
      orderId: orderId
    }
  }).then(res => {
    const weChatConfig = res.data || {};

    // 转换 timeStamp 为字符串
    weChatConfig.timeStamp = '' + weChatConfig.timeStamp;

    // 微信支付失败后的回调
    weChatConfig.fail = err => {
      // 用户取消支付时，调用 callback
      if (err.errMsg === 'requestPayment:fail cancel') {
        typeof callback === 'function' && callback();
      } else {
        payResult(orderId, FAIL_TAG);
      }
    };

    // 微信支付成功或失败都调用 callback，用来兼容 6.5.2 及之前版本取消支付时不触发 fail 回调的问题
    if (typeof callback === 'function') {
      weChatConfig.complete = callback();
    }

    // 微信支付成功后的回调分别放在 pay 和 payForGift 中定义
    return weChatConfig;
  }).catch(err => {
    payResult(orderId, FAIL_TAG);
  });
};

function pay(orderId, productList, finalCost, callback) {
  return basePay(orderId, callback).then(weChatConfig => {
    // 微信支付成功后的回调
    weChatConfig.success = res => {
      gaEcommercePurchase(productList, orderId, finalCost, '普通订单支付成功', 'view', orderId);
      setTimeout(() => {
        payResult(orderId, SUCCESS_TAG);
      }, 1000);
    };

    // 发起支付请求，调用微信支付
    wx.requestPayment(weChatConfig);
  });
}

function payForGift(orderId, signedId, productList, finalCost, callback) {
  return basePay(orderId, callback).then(weChatConfig => {
    // 微信支付成功后的回调
    weChatConfig.success = res => {
      gaEcommercePurchase(productList, orderId, finalCost, '送礼订单支付成功', 'view', orderId);
      setTimeout(() => {
        payForGiftResult(signedId);
      }, 1000);
    };

    // 发起支付请求，调用微信支付
    wx.requestPayment(weChatConfig);
  });
}

function gaEcommercePurchase(productList, orderId, finalCost, gaCategory, gaAction, gaLabel) {
  const gaProductList = productList.map(item => {
    return {
      id: item.product || item.product_id, // 结算时会取 product，重新支付取 product_id
      name: item.title,
      price: item.unit_price,
      quantity: item.quantity,
      variant: item.spec_str
    }
  });
  App.gaEcommercePurchase(gaProductList, orderId, finalCost, gaCategory, gaAction, gaLabel);
}

module.exports = { pay, payForGift };
