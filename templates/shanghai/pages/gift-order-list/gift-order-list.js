import Config from '../../utils/config';
import Utils from '../../utils/utils';

import CONSTANTS from '../../utils/constants';

const App = getApp();

Page({
  data: {
    giftOrderListScrollTop: 0,
  },

  onLoad() {
    this.isInitGiftOrderList = false;
    this.init();

    App.gaScreenView('我的礼物');
  },

  onShow() {
    if (this.isInitGiftOrderList) {
      this.getGiftOrder();
    }
  },

  init() {
    Utils.showLoadingToast('加载中...');
    this.getGiftOrder().then(res => {
      this.isInitGiftOrderList = true;
      Utils.delayHideToast();
    });
  },

  loadMoreGiftOrder() {
    if (this.isLoadingMoreGiftOrderList || this.data.isNoMoreGiftOrderList) {
      return;
    }

    wx.showToast({
      title: '加载更多...',
      icon: 'loading',
      duration: 10000
    });

    this.isLoadingMoreGiftOrderList = true;

    this.getMoreGiftOrderList();
  },

  getMoreOrderList() {
    let offset = this.orderListOffset + Config.ORDER_LIST_LIMIT;

    return App.request({
      url: Config.API.ORDER_QUERY,
      data: {
        limit: Config.ORDER_LIST_LIMIT,
        offset: offset
      }
    }).then(res => {
      let orderList = this.data.orderList;
      const newOrderList = res.data.objects || [];

      if (newOrderList.length) {
        newOrderList.forEach(item => {
          item.statusStr = Config.ORDER_STATUS_STR[item.status];
          item = this.setSpec(item);
          item.productCount = this.getProductCount(item.items);
        });

        orderList = orderList.concat(newOrderList);

        this.setData({
          orderList
        });

        this.orderListOffset += Config.ORDER_LIST_LIMIT;
      } else {
        this.setData({
          isNoMoreOrderList: true
        });
      }
    }).catch(err => {
      wx.showModal({
        title: '网络似乎出了问题',
        content: '点击确定自动刷新',

        success: res => {
          if (res.confirm) {
            this.getMoreOrderList();
          }
        }
      });
    }).finally(res => {
      this.isLoadingMoreOrderList = false;
      Utils.delayHideToast();
    });
  },

  getMoreGiftOrderList() {
    let offset = this.giftOrderListOffset + Config.ORDER_LIST_LIMIT;

    return App.request({
      url: Config.API.GIFT_ORDER_RECEIVED,
      data: {
        limit: Config.ORDER_LIST_LIMIT,
        offset: offset
      }
    }).then(res => {
      let giftOrders = this.data.giftOrders;
      const newGiftOrderList = res.data.objects || [];

      if (newGiftOrderList.length) {
        newGiftOrderList.forEach(item => {
          item.statusStr = Config.ORDER_STATUS_STR[item.status];
          item = this.setSpec(item);
          item.productCount = this.getProductCount(item.items);
        });

        giftOrders = giftOrders.concat(newGiftOrderList);

        this.setData({
          giftOrders
        });

        this.giftOrderListOffset += Config.ORDER_LIST_LIMIT;
      } else {
        this.setData({
          isNoMoreGiftOrderList: true
        });
      }
    }).catch(err => {
      wx.showModal({
        title: '网络似乎出了问题',
        content: '点击确定自动刷新',

        success: res => {
          if (res.confirm) {
            this.getMoreGiftOrderList();
          }
        }
      });
    }).finally(res => {
      this.isLoadingMoreGiftOrderList = false;
      Utils.delayHideToast();
    });
  },

  // 获取礼物订单列表
  getGiftOrder() {
    this.isLoadingMoreGiftOrderList = false;
    this.giftOrderListOffset = 0;

    this.setData({
      giftOrderListScrollTop: 0,
      isNoMoreGiftOrderList: false
    });

    return App.request({
      url: Config.API.GIFT_ORDER_RECEIVED,
      data: {
        limit: Config.ORDER_LIST_LIMIT,
        offset: 0
      }
    }).then(res => {
      let giftOrders = res.data.objects;

      if (giftOrders.length) {
        giftOrders.forEach(item => {
          item.statusStr = Config.ORDER_STATUS_STR[item.status];
          item = this.setSpec(item);
          item.productCount = this.getProductCount(item.items);
        });

        this.setData({
          giftOrders,
          isEmptyGiftOrderList: false
        });
      } else {
        this.setData({
          isEmptyGiftOrderList: true
        });
      }
    }).catch(err => {
      if (App.isAuthorized()) {
        wx.showModal({
          title: '网络似乎出了问题',
          content: '点击确定自动刷新',

          success: res => {
            if (res.confirm) {
              this.getGiftOrder();
            }
          }
        });
      }
    });
  },

  /**
   * 获取礼物物流追踪信息
   */
  getGiftTrackingInfo(e) {
    const index = e.currentTarget.dataset.index;
    const oindex = e.currentTarget.dataset.oindex;
    const orderItem = this.data.giftOrders[index].items[oindex];

    const coverImage = orderItem.cover_image;
    const shipCarrier = orderItem.ship_carrier;
    const waybillNumber = orderItem.waybill_number;
    const trackingInfo = orderItem.tracking_info || [];
    const isMysterious = this.data.giftOrders[index].is_mysterious;

    const info = {
      coverImage,
      shipCarrier,
      waybillNumber,
      trackingInfo,
      isMysterious
    };

    App.storage.set('tracking_info', info);

    wx.navigateTo({
      url: Config.ROUTE.TRACKING_INFO
    });
  },

  /**
   * 计算每个订单的总商品件数
   * @param  {Array} productList 商品列表
   */
  getProductCount(productList) {
    let productCount = 0;
    productList.forEach(item => {
      productCount += item.quantity;
    });
    return productCount;
  },

  /**
   * 给订单列表设置要显示的规格
   * @param {Array} order  订单列表
   */
  setSpec(order) {
    const productList = order.items;
    for (let i = 0; i < productList.length; i++) {
      productList[i].statusStr = Config.ORDER_ITEM_STATUS_STR[productList[i].status];

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

    order.items = productList;
    return order;
  },

  confirmReceived(e) {
    const that = this;

    const orderId = this.data.giftOrders.id;
    const index = e.currentTarget.dataset.index;
    const oindex = e.currentTarget.dataset.oindex;
    const orderItemId = this.data.giftOrders[index].items[oindex].id;

    const items = [orderItemId];

    wx.showModal({
      title: '确定已经收到了商品了吗？',
      success: function () {
        App.request({
          url: Config.API.GIFT_ORDER_CONFIRM,
          method: 'PUT',
          data: {
            items
          }
        }).then(res => {
          that.init();
        }).catch(err => {
          console.log(err);
        });
      },
      fail: function () {
        return
      }
    })

  },

  confirmAllReceived(e) {
    const that = this;

    const orderIndex = e.currentTarget.dataset.index;
    let currentOrder = this.data.giftOrders[orderIndex].items;
    let items = currentOrder.map(item => item.id);

    wx.showModal({
      title: '确定已经收到了商品了吗？',
      success: function () {
        App.request({
          url: Config.API.GIFT_ORDER_CONFIRM,
          method: 'PUT',
          data: {
            items
          }
        }).then(res => {
          that.init();
        });
      },
      fail: function () {
        return
      }
    })
  },

  // 礼物列表 scrollTop
  setGiftOrderListScrollTop(e) {
    clearTimeout(this.setGiftOrderListScrollTopTimer);
    this.setGiftOrderListScrollTopTimer = setTimeout(() => {
      this.setData({
        giftOrderListScrollTop: e.detail.scrollTop
      });
    }, 500);
  },

  navToHome() {
    App.navToHome();
  },
});
