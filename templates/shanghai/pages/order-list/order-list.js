import Config from '../../utils/config';
import Utils from '../../utils/utils';
import { COUPON_BG } from '../../images/base64-images';

import CONSTANTS from '../../utils/constants';

const App = getApp();

Page({
  data: {
    CouponExplain: Config.COUPON_EXPLAIN,

    navTabs: {
      bindtapName: 'toggleTab',
      tabs: ['全部', '待付款', '待发货', '待收货', '售后服务'],
      status: [Config.NAV_TAB_ACTIVE_CLASS, '', '', '', '']
    },
    orderStatus: ['', 'initiated', 'processing', 'shipped', 'refunding'],
    currentTabIndex: 0,
    orderListScrollTop: 0,
    lockedCancelOrders: {},

    orderList: [],
    isEmptyOrderList: false,
    isNoMoreOrderList: false,
  },

  onLoad(option) {
    const orderStatusIndex = option.orderStatusIndex || 0;
    this.orderStatusIndex = orderStatusIndex;
    this.initTab();
    this.isInitOrderList = false;
    this.isInitGiftOrderList = false;

    this.init();

    App.gaScreenView('我的订单');
  },

  onShow() {
    if (this.isInitOrderList) {
      this.initOrderList();
    }
  },

  init() {
    Utils.showLoadingToast('加载中...');
    this.initOrderList().then(res => {
      Utils.delayHideToast();
      this.isInitOrderList = true;
    });
  },

  /**
   * 取消订单
   */
  cancelOrder(e) {
    const index = e.currentTarget.dataset.index;
    const orderId = this.data.orderList[index].id;
    const lockedCancelOrders = this.data.lockedCancelOrders;

    if (lockedCancelOrders[index] === undefined) {
      lockedCancelOrders[index] = true;
    }

    if (lockedCancelOrders[index]) {
      lockedCancelOrders[index] = false;

      App.request({
        url: Config.API.ORDER_OPERATION,
        method: 'DELETE',
        data: {
          orderId
        }
      }).then(res => {
        this.initOrderList();
      }).catch(err => {
        lockedCancelOrders[index] = undefined;
        this.setData({
          lockedCancelOrders
        });
      });

      this.setData({
        lockedCancelOrders
      });
    }
  },

  /**
   * 去付款，跳转到订单详情页
   */
  repayOrder(e) {
    const index = e.currentTarget.dataset.index;
    const orderId = this.data.orderList[index].id;
    wx.navigateTo({
      url: Config.ROUTE.ORDER_DETAIL + '?orderId=' + orderId
    })
  },

  /**
   * 获取订单列表
   */
  initOrderList() {
    this.isLoadingMoreOrderList = false;
    this.orderListOffset = 0;
    const orderStatusIndex = this.orderStatusIndex;
    let url = Config.API.ORDER_QUERY;

    if (orderStatusIndex != 0) {
      url += '&item_status=' + this.data.orderStatus[orderStatusIndex];
    }

    this.setData({
      orderListScrollTop: 0,
      isNoMoreOrderList: false
    });

    return App.request({
      url: url,
      data: {
        limit: Config.ORDER_LIST_LIMIT,
        offset: 0
      }
    }).then(res => {
      const orderList = res.data.objects || [];

      if (orderList.length) {
        orderList.forEach(item => {
          item.statusStr = Config.ORDER_STATUS_STR[item.status];
          item = this.setSpec(item);
          item.productCount = this.getProductCount(item.items);
          item.final_cost = Math.round(item.final_cost * 100) / 100;
          item.wechat_info.settlement_total_amount = Math.round(item.wechat_info.settlement_total_amount * 100) / 100;
        });

        this.setData({
          orderList,
          isEmptyOrderList: false
        });
      } else {
        this.setData({
          isEmptyOrderList: true
        });
      }
    }).catch(err => {
      if (App.isAuthorized()) {
        wx.showModal({
          title: '网络似乎出了问题',
          content: '点击确定自动刷新',

          success: res => {
            if (res.confirm) {
              this.initOrderList();
            }
          }
        });
      }
    });
  },

  loadMoreOrder() {
    if (this.isLoadingMoreOrderList || this.data.isNoMoreOrderList) {
      return;
    }

    wx.showToast({
      title: '加载更多...',
      icon: 'loading',
      duration: 10000
    });

    this.isLoadingMoreOrderList = true;

    this.getMoreOrderList();
  },

  getMoreOrderList() {
    let offset = this.orderListOffset + Config.ORDER_LIST_LIMIT;
    const orderStatusIndex = this.orderStatusIndex;
    let url = Config.API.ORDER_QUERY;

    if (orderStatusIndex != 0) {
      url += '&item_status=' + this.data.orderStatus[orderStatusIndex];
    }

    return App.request({
      url,
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
          item.final_cost = Math.round(item.final_cost * 100) / 100;
          item.wechat_info.settlement_total_amount = Math.round(item.wechat_info.settlement_total_amount * 100) / 100;
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

  /**
   * 确认收货
   */
  confirmDeliver(e) {
    const orderId = this.data.orderList.id;
    const index = e.currentTarget.dataset.index;
    const oindex = e.currentTarget.dataset.oindex;
    const orderItemId = this.data.orderList[index].items[oindex].id;
    const that = this;

    wx.showModal({
      title: '确定已经收到商品了吗？',
      success: function () {
        App.request({
          url: Config.API.ORDER_ITEM_OPERATION,
          method: 'PUT',
          data: {
            orderItemId
          },
        }).then(res => {
          that.init();
        });
      },
      fail: function () {
        return
      }
    })

  },

  /**
   * 获取物流追踪信息
   */
  getTrackingInfo(e) {
    const orderId = this.data.orderList.id;

    const index = e.currentTarget.dataset.index;
    const oindex = e.currentTarget.dataset.oindex;
    const orderItem = this.data.orderList[index].items[oindex];

    const coverImage = orderItem.cover_image;
    const shipCarrier = orderItem.ship_carrier;
    const waybillNumber = orderItem.waybill_number;
    const trackingInfo = orderItem.tracking_info || [];

    const info = {
      coverImage,
      shipCarrier,
      waybillNumber,
      trackingInfo
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

  // 初始化导航列表
  initTab() {
    const orderStatusIndex = this.orderStatusIndex;
    let status = this.data.navTabs.status.fill('');
    status[orderStatusIndex] = Config.NAV_TAB_ACTIVE_CLASS;

    this.setData({
      'navTabs.status': status,
      currentTabIndex: orderStatusIndex,
    })
  },

  toggleTab(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const tabs = this.data.navTabs.tabs;
    const status = [];

    for (let i = 0; i < tabs.length; i++) {
      if (i === index) {
        status.push(Config.NAV_TAB_ACTIVE_CLASS);
      } else {
        status.push('');
      }
    }

    this.orderStatusIndex = index;
    this.init();
    this.setData({
      'navTabs.status': status,
      currentTabIndex: index,
    });
  },

  /**
   * 订单列表 scrollTop
   */
  setOrderListScrollTop(e) {
    clearTimeout(this.setOrderListScrollTopTimer);
    this.setOrderListScrollTopTimer = setTimeout(() => {
      this.setData({
        orderListScrollTop: e.detail.scrollTop
      });
    }, 500);
  },

  navToHome() {
    App.navToHome();
  },

  // 申请售后
  getRefund(e) {
    var refundItem = e.currentTarget.dataset.item;
    var now = new Date().getTime();
    var DEADTIME = 20 * 24 * 60 * 60 * 1000;
    var createdAt = refundItem.created_at * 1000;

    refundItem = JSON.stringify(refundItem);

    if ((now - createdAt) > DEADTIME) {
      wx.showModal({
        title: '支付完成后20天内才可提交售后申请',
        content: '超出20天，如需售后，请联系客服',
        showCancel: false
      })
      return
    }

    console.log(e.currentTarget.dataset.item);
    wx.navigateTo({
      url: Config.ROUTE.ORDER_REFUND + '?refundItem=' + refundItem
    });
  },

  // 售后进度
  getRefundState(e) {
    var refundItem = e.currentTarget.dataset.item.refund_id;
    console.log(refundItem);
    wx.navigateTo({
      url: Config.ROUTE.ORDER_REFUND_STATE + '?id=' + refundItem
    });
  },

  // 加载更多
  loadMoreRecommand() {
    console.log('more')
    if (this.isLoadingMoreRecommandList || this.data.isNoMoreRecommandList) {
      return;
    }

    wx.showToast({
      title: '加载更多...',
      icon: 'loading',
      duration: 10000
    });

    this.isLoadingMoreRecommandList = true;

    this.getMoreRecommandList();
  },

  // 获取更多推荐列表
  getMoreRecommandList() {
    let offset = this.recommandListOffset + Config.ORDER_LIST_LIMIT;

    return App.request({
      url: Config.API.PRODUCT_RECOMMEND,
      data: {
        limit: Config.ORDER_LIST_LIMIT,
        offset: offset
      }
    }).then(res => {
      let recommandList = this.data.recommandList;
      let newRecommandList = res.data.objects || [];

      if (newRecommandList.length) {
        newRecommandList = Utils.formatePrices(newRecommandList);
        newRecommandList = Utils.formateShelfsDescription(newRecommandList);

        recommandList = recommandList.concat(newRecommandList);

        this.setData({
          recommandList
        });

        this.recommandListOffset += Config.ORDER_LIST_LIMIT;
      } else {
        this.setData({
          isNoMoreRecommandList: true
        });
      }
    }).catch(err => {
      wx.showModal({
        title: '网络似乎出了问题',
        content: '点击确定自动刷新',

        success: res => {
          if (res.confirm) {
            this.getMoreRecommandList();
          }
        }
      });
    }).finally(res => {
      this.isLoadingMoreRecommandList = false;
      Utils.delayHideToast();
    });
  }
});
