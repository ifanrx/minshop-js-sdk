import Config from '../../utils/config';
import Utils from '../../utils/utils';
import Auth from '../../utils/auth';

const App = getApp()

Page({
  data: {
    wxExt: Config.WX_EXT,
  },

  onLoad: function (options) {
    this.isFirstIn = true;
    if (App.isAuthorized()) {
      this.init()
    }

    App.gaScreenView('我的');
  },

  onShow: function () {
    if (!this.isFirstIn && App.isAuthorized()) {
      this.init()
    }
    this.isFirstIn = false;
  },

  login() {
    Auth.init().then(() => {
      if (App.isAuthorized()) {
        this.init()
      }
    });

  },

  getUserInfo() {
    if (this.data.hasLogin) {
      return;
    }

    wx.showLoading({
      title: '登录中...',
    });

    return App.request({
      url: Config.API.USER_PROFILE,
      method: 'GET'
    }).then(res => {
      const userInfo = res.data;
      this.setData({
        userInfo,
        hasLogin: true
      });
      wx.hideLoading()
    }).catch(err => {
      wx.hideLoading()
      if (App.isAuthorized()) {
        wx.showModal({
          title: '网络似乎出了问题',
          content: '点击确定自动刷新',

          success: res => {
            if (res.confirm) {
              this.getUserInfo();
            }
          }
        });
      }
    });
  },

  init() {
    this.getUserInfo();
    this.initOrderList();
    // this.initCouponList();
    this.getGiftOrder();
    this.getCollectionList();
  },

  /**
   * 获取待订单数量信息
   */
  initOrderList(status) {
    let url = Config.API.ORDER_STATES;

    let that = this;

    return App.request({
      url: url
    }).then(res => {
      const data = res.data;
      this.setData({
        initiatedOrderCounts: data.initiated,
        processingOrderCounts: data.processing,
        refundingOrderCounts: data.refunding,
        shippedOrderCounts: data.shipped
      })
    }).catch(err => {
      if (App.isAuthorized()) {

        wx.showModal({
          title: '网络似乎出了问题',
          content: '点击确定自动刷新',

          success: res => {
            if (res.confirm) {
              that.initOrderList();
            }
          }
        });
      }
    });
  },

  // 获取礼物订单列表
  getGiftOrder() {

    return App.request({
      url: Config.API.GIFT_ORDER_RECEIVED,
      data: {
        limit: Config.ORDER_LIST_LIMIT,
        offset: 0
      }
    }).then(res => {
      let giftCounts = res.data.meta.total_count || 0;
      this.setData({
        giftCounts
      })

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
   * 初始化优惠券列表
   */
  initCouponList() {
    const status = 'redeemed';

    const data = {
      status,
      limit: Config.COUPON_LIST_LIMIT,
      offset: 0,
      order_by: '-redeemed_at'
    };

    return App.request({
      url: Config.API.COUPON_QUERY,
      data: data
    }).then(res => {
      let couponCounts = res.data.meta.total_count || 0;
      this.setData({
        couponCounts
      })
    }).catch(err => {
      wx.showModal({
        title: '网络似乎出了问题',
        content: '点击确定自动刷新',

        success: res => {
          if (res.confirm) {
            this.initCouponList();
          }
        }
      });
    });
  },

  // 获取收藏列表
  getCollectionList() {

    return App.request({
      url: Config.API.COLLECTION_LIST,
      data: {
        limit: 100,
        offset: 0
      }
    }).then(res => {
      let collectionCounts = res.data.meta.total_count || 0;

      this.setData({
        collectionCounts
      })

    }).catch(err => {
      if (App.isAuthorized()) {
        wx.showModal({
          title: '网络似乎出了问题',
          content: '点击确定自动刷新',

          success: res => {
            if (res.confirm) {
              this.getCollectionList();
            }
          }
        });
      }
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
})
