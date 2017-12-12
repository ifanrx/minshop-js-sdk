var CONFIG = require('../../utils/config.js');
var payUtil = require('../../utils/pay.js');

const App = getApp();

Page({
  data: {
    order: {},
    isGiftOrder: false,
    isGiftRemeeded: false,
    isNotPaid: true
  },

  onLoad(options) {
    const orderId = options.orderId;

    if (!orderId) {
      wx.navigateBack();
    }

    this.getOrderDetail(orderId);
    App.gaScreenView('订单详情');
  },

  // 获取订单详情
  getOrderDetail(orderId, sessionkey) {
    App.request({
      url: CONFIG.API.ORDER_OPERATION,
      data: {
        orderId
      },
    }).then(res => {
      const order = res.data || {};

      order.statusStr = CONFIG.ORDER_STATUS_STR[order.status];
      order.created_at = this.formateTimestamp(order.created_at, 'ymdhm');
      order.final_cost = Math.round(order.final_cost * 100) / 100;
      order.wechat_info.settlement_total_amount = Math.round(order.wechat_info.settlement_total_amount * 100) / 100;

      this.setData({
        order
      });

      this.setData({
        isNotPaid: order.status === 'not_paid'
      });

      this.getIsGiftOrder(order);
      this.getGiftStatus(order);
      this.getProductCount(order.items);
      this.setSpec(order.items);
    });
  },

  getIsGiftOrder(order) {
    if (order.gift_order != undefined) {
      this.setData({
        isGiftOrder: true
      });
    }
  },

  getGiftStatus: function (order) {
    if (this.data.isGiftOrder) {
      this.setData({
        signedId: order.gift_order.signed_id
      });
    }

    if (this.data.isGiftOrder && order.gift_order.beneficiary != undefined) {
      this.setData({
        isGiftRemeeded: true,
        gifteeNickname: order.gift_order.beneficiary
      });
    }
  },

  getProductCount(productList) {
    let productCount = 0;
    productList.forEach(function (item) {
      productCount += item.quantity;
    });
    this.setData({
      productCount
    });
  },

  formateTimestamp(stamp, type) {
    const date = parseInt(stamp, 10) * 1000;
    const dateObj = new Date();

    let year;
    let month;
    let day;
    let hour;
    let minute;
    let result;

    dateObj.setTime(date);
    year = dateObj.getFullYear();

    month = dateObj.getMonth() + 1;
    month = month > 9 ? month : '0' + month;

    day = dateObj.getDate();
    day = day > 9 ? day : '0' + day;

    hour = dateObj.getHours();
    hour = hour > 9 ? hour : '0' + hour;

    minute = dateObj.getMinutes();
    minute = minute > 9 ? minute : '0' + minute;

    switch (type) {
      // maa 时间格式
      case 'md':
        result = '' + month + ' / ' + day;
        break;
      case 'ymd':
        result = '' + year + '-' + month + '-' + day;
        break;
      case 'ymdzh':
        result = '' + year + '年' + parseInt(month, 10) + '月' + parseInt(day, 10) + '日';
        break;
      case 'ymdhm':
        result = '' + year + '-' + month + '-' + day + ' ' + hour + ':' + minute;
        break;
      case 'ymdhmzh':
        result = '' + year + '年' + parseInt(month, 10) + '月' + parseInt(day, 10) + '日  ' + hour + ':' + minute;
        break;
      case 'mdhmzh':
        result = '' + parseInt(month, 10) + '月' + parseInt(day, 10) + '日  ' + hour + ':' + minute;
        break;
      default:
        result = '' + month + '-' + day + '  ' + hour + ':' + minute;
        break;
    }

    return result;
  },
  // 设置商品的规格字段 和 商品状态描述
  setSpec(productList) {
    for (let i = 0; i < productList.length; i++) {
      // 设置商品状态描述
      productList[i].statusStr = CONFIG.ORDER_ITEM_STATUS_STR[productList[i].status];

      if (!productList[i].spec_str) {
        continue;
      }
      let specStr = '';
      let specs = productList[i].spec_str.split(',');
      for (let t = 0; t < specs.length; t++) {
        if (specStr) {
          specStr += ' / ' + specs[t].split(':')[1];
        } else {
          specStr += specs[t].split(':')[1];
        }
      }
      productList[i].spec = specStr;
    }
    this.setData({
      'order.items': productList
    })
  },
  // 确认收货
  confirmDeliver(e) {
    const order = this.data.order;
    const orderId = order.id;
    const orderItemId = order.items[index].id;
    const index = e.currentTarget.dataset.index;

    App.request({
      url: CONFIG.API.ORDER_ITEM_OPERATION,
      method: 'PUT',
      data: {
        orderItemId
      },
    }).then(res => {
      this.getOrderDetail(orderId);
    });
  },

  getTrackingInfo(e) {
    const index = e.currentTarget.dataset.index;
    const orderItem = this.data.order.items[index];

    const coverImage = orderItem.cover_image;
    const shipCarrier = orderItem.ship_carrier;
    const waybillNumber = orderItem.waybill_number;
    const trackingInfo = orderItem.tracking_info || [];

    const info = {
      coverImage,
      shipCarrier,
      waybillNumber,
      trackingInfo
    }

    wx.setStorageSync('tracking_info', info);
    wx.navigateTo({
      url: CONFIG.ROUTE.TRACKING_INFO
    });
  },

  // 再次支付
  repay() {
    const order = this.data.order;
    const orderId = order.orderid;
    const finalCost = order.final_cost;
    const signedId = this.data.signedId;

    if (!this.data.isGiftOrder) {
      payUtil.pay(orderId, order.items, finalCost);
      App.gaEvent('普通订单重新支付-订单详情页', 'click');
    } else {
      payUtil.payForGift(orderId, signedId, order.items, finalCost);
      App.gaEvent('送礼订单重新支付-订单详情页', 'click');
    }
  },

  cancelOrder(e) {
    const orderId = this.data.order.id;

    App.request({
      url: CONFIG.API.ORDER_OPERATION,
      method: 'DELETE',
      data: {
        orderId
      }
    }).then(res => {
      this.getOrderDetail(orderId);
    });
  },

  // 申请售后
  getRefund(e) {
    let refundItem = e.currentTarget.dataset.item;
    const now = new Date().getTime();
    const DEADTIME = 20 * 24 * 60 * 60 * 1000;
    const createdAt = refundItem.created_at * 1000;

    refundItem = JSON.stringify(refundItem);

    if ((now - createdAt) > DEADTIME) {
      wx.showModal({
        title: '支付完成后20天内才可提交售后申请',
        content: '超出20天，如需售后，请联系客服',
        showCancel: false
      })
      return;
    }

    wx.navigateTo({
      url: CONFIG.ROUTE.ORDER_REFUND + '?refundItem=' + refundItem
    });
  },

  // 售后进度
  getRefundState(e) {
    const refundItem = e.currentTarget.dataset.item.refund_id;

    wx.navigateTo({
      url: CONFIG.ROUTE.ORDER_REFUND_STATE + '?id=' + refundItem
    });
  },

  navToDetail(e) {
    const dataset = e.currentTarget.dataset;

    wx.redirectTo({
      url: CONFIG.ROUTE.DETAIL + '?id=' + dataset.id
    });
  },

});
