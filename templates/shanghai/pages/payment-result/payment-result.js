import Config from '../../utils/config';
import payUtil from '../../utils/pay';

const App = getApp();

Page({
  data: {
    orderId: '',
    order: {},
    tip: {},
    isGiftOrder: false,
    homeName: 'Coolbuy',
    corpName: '爱范儿',
    successTip: {
      icon: 'success',
      title: '支付成功',
      content: '恭喜您已成功支付产品',
      primaryBtnName: '完成支付',
      primaryBtnBind: 'navToUserCenter',
      defaultBtnName: '回到首页',
      defaultBtnBind: 'navToHome'
    },
    failedTip: {
      icon: 'clear',
      title: '支付失败',
      content: '支付未能完成，您可以再次支付',
      primaryBtnName: '再次支付',
      primaryBtnBind: 'repay',
      defaultBtnName: '回到首页',
      defaultBtnBind: 'navToHome'
    }
  },

  onLoad(options) {
    options = options || {};
    const result = options.result;
    const orderId = options.orderId || '1';

    let tip = {};
    if (result == 'success') {
      tip = this.data.successTip;
      wx.clearStorageSync('coupon');
      App.gaScreenView('支付成功');
    } else {
      tip = this.data.failedTip;
      App.gaScreenView('支付失败');
      this.queryOrderDetail(orderId);
    }

    this.setData({
      paymentResult: result,
      orderId: orderId,
      tip: tip
    });
  },

  onReady() {
    const title = this.data.tip.title;
    wx.setNavigationBarTitle({
      title
    });
  },

  queryOrderDetail(orderId) {
    App.request({
      url: Config.API.ORDER_OPERATION,
      data: {
        orderId
      },
    }).then(res => {
      const order = res.data;
      this.setData({
        order
      });
      this.getIsGiftOrder(order);
    });
  },

  getIsGiftOrder(order) {
    if (order.gift_order != undefined) {
      this.setData({
        isGiftOrder: true
      });
    }
  },

  repay() {
    const orderId = this.data.orderId;
    const order = this.data.order;
    const finalCost = order.final_cost;
    const productList = order.items;

    if (this.data.isGiftOrder) {
      const signedId = order.signed_id;
      payUtil.payForGift(orderId, signedId, productList, finalCost);
      App.geEvent('送礼订单重新支付-支付结果页', 'click');
    } else {
      payUtil.pay(orderId, productList, finalCost);
      App.geEvent('普通订单重新支付-支付结果页', 'click');
    }
  },

  navToHome() {
    App.navToHome();
  },

  navToUserCenter() {
    wx.switchTab({
      url: Config.ROUTE.USER_CENTER
    });
  }
});
