import Config from '../../utils/config';
import Utils from '../../utils/utils';

import CONSTANTS from '../../utils/constants';

const App = getApp();

Page({
  data: {
    navTabs: {
      bindtapName: 'toggleTab',
      tabs: ['未使用', '已使用', '已过期'],
      status: [Config.NAV_TAB_ACTIVE_CLASS, '', '']
    },
    couponStatus: ['redeemed', 'used', 'expired'],
    currentTabIndex: 0,

    CouponExplain: Config.COUPON_EXPLAIN,

    couponListScrollTop: 0,
    couponList: [],
    redeemedCoupon: {},
    redeemCouponErrorMsg: '',
    validCouponTotalCount: 14,
    isEmptyCouponList: false,
    isNoMoreCouponList: false,

    redeemCouponInputData: {
      coupon_code: '',
      password: ''
    },

    isShowRedeemCouponModal: false,
    isRedeemCouponSuccess: false,
    isRedeemCouponFailed: false,
  },

  onLoad() {
    this.couponStatusIndex = 0;
    this.init();

    App.gaScreenView('我的优惠券');
  },

  init() {
    Utils.showLoadingToast('加载中...');

    this.initCouponList();

    Utils.delayHideToast();

  },

  /**
   * 初始化优惠券列表
   */
  initCouponList() {
    this.isLoadingMoreCouponList = false;
    this.couponListOffset = 0;
    const status = this.data.couponStatus[this.couponStatusIndex];

    this.setData({
      couponListScrollTop: 0,
      isNoMoreCouponList: false
    });

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
      let couponList = res.data.objects || [];

      if (couponList.length) {
        couponList = Utils.formatCouponListValidTime(couponList);

        this.setData({
          couponList,
          isEmptyCouponList: false
        });
      } else {
        this.setData({
          couponList,
          isEmptyCouponList: true
        });
      }

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

  /**
   * 获取更多优惠券
   */
  getMoreCouponList() {
    let offset = this.couponListOffset + Config.COUPON_LIST_LIMIT;
    const status = this.data.couponStatus[this.couponStatusIndex];
    console.log(this.couponListOffset)
    let data = {
      status,
      limit: Config.COUPON_LIST_LIMIT,
      offset: offset,
      order_by: '-redeemed_at'
    };

    return App.request({
      url: Config.API.COUPON_QUERY,
      data: data
    }).then(res => {
      let couponList = this.data.couponList;
      let newCouponList = res.data.objects || [];

      if (newCouponList.length) {
        newCouponList = Utils.formatCouponListValidTime(newCouponList);
        couponList = couponList.concat(newCouponList);

        this.setData({
          couponList
        });

        this.couponListOffset += Config.COUPON_LIST_LIMIT;

        Utils.delayHideToast();
        this.isLoadingMoreCouponList = false;
      } else {
        this.setData({
          isNoMoreCouponList: true
        });
        Utils.delayHideToast();
        this.isLoadingMoreCouponList = false;
      }
      return res;
    }).catch(err => {
      wx.showModal({
        title: '网络似乎出了问题',
        content: '点击确定自动刷新',

        success: res => {
          if (res.confirm) {
            this.getMoreCouponList();
          }
        }
      });
      Utils.delayHideToast();
      this.isLoadingMoreCouponList = false;
    });
  },

  /**
   * 加载更多优惠券
   */
  loadMoreCouponList() {
    if (this.isLoadingMoreCouponList || this.data.isNoMoreCouponList) {
      return;
    }

    wx.showToast({
      title: '加载更多...',
      icon: 'loading',
      duration: 10000
    });

    this.isLoadingMoreCouponList = true;

    this.getMoreCouponList();
  },

  /**
   * 保存兑换优惠券的输入信息
   */
  redeemCouponInput(e) {
    clearTimeout(this.redeemCouponInputTimer);

    const filed = e.currentTarget.dataset.filed;
    const currentInputValue = e.detail.value.trim() || '';
    const redeemCouponInputData = this.data.redeemCouponInputData;

    if (filed === this.oldRedeemCouponInputFiled && currentInputValue === this.oldRedeemCouponInputValue) {
      return;
    }

    if (currentInputValue) {
      this.oldRedeemCouponInputValue = currentInputValue;
    } else {
      this.oldRedeemCouponInputValue = '';
    }

    this.oldRedeemCouponInputFiled = filed;

    this.redeemCouponInputTimer = setTimeout(() => {
      redeemCouponInputData[filed] = currentInputValue;
      this.setData({
        redeemCouponInputData
      });
    }, 500);
  },

  /**
   * 处理兑换优惠券
   */
  redeemCouponHandle() {
    const redeemCouponInputData = this.data.redeemCouponInputData;

    App.request({
      url: Config.API.COUPON_REDEEM,
      method: 'POST',
      data: {
        coupon_code: redeemCouponInputData.coupon_code,
        password: redeemCouponInputData.password
      }
    }).then(res => {
      const redeemedCoupon = res.data;

      if (redeemedCoupon.valid_until > parseInt(Date.now() / 1000)) {
        this.initCouponList();
        this.setData({
          redeemedCoupon,
          isRedeemCouponSuccess: true
        });
      } else {
        const redeemCouponErrorMsg = '该优惠券已过期，下次要抓紧时间兑换使用哦';

        this.setData({
          redeemCouponErrorMsg,
          isRedeemCouponFailed: true
        });
      }
    }).catch(err => {
      const errorMsg = err.data;

      let redeemCouponErrorMsg = '';
      if ([CONSTANTS.COUPON_REDEEMED_ERROR.INVALID, CONSTANTS.COUPON_REDEEMED_ERROR.FAILED].indexOf(errorMsg) !== -1) {
        redeemCouponErrorMsg = '添加失败，请核对您的兑换码及密码，再重新添加';
      } else if (errorMsg === CONSTANTS.COUPON_REDEEMED_ERROR.REDEEMED) {
        redeemCouponErrorMsg = '该优惠券兑换码已被使用，无法再次兑换';
      } else if (errorMsg === CONSTANTS.COUPON_REDEEMED_ERROR.EXPIRED) {
        redeemCouponErrorMsg = '该优惠券已过期，下次要抓紧时间兑换使用哦';
      } else {
        redeemCouponErrorMsg = errorMsg;
      }

      this.setData({
        redeemCouponErrorMsg,
        isRedeemCouponFailed: true
      });
    }).finally(res => {
      this.isRedeemingCoupon = false;
    });
  },

  /**
   * 点击优惠券兑换按钮
   */
  redeemCoupon() {
    if (this.isRedeemingCoupon) {
      return;
    }

    this.isRedeemingCoupon = true;
    this.redeemCouponHandle();
  },

  /**
   * 重置兑换优惠券的所有初始状态
   */
  resetRedeemCoupon() {
    this.setData({
      isRedeemCouponFailed: false,
      isRedeemCouponSuccess: false,
      redeemCouponErrorMsg: '',
      "redeemCouponInputData.coupon_code": '',
      "redeemCouponInputData.password": ''
    });
  },

  showRedeemCouponModal() {
    this.setData({ isShowRedeemCouponModal: true });
  },

  hideRedeemCouponModal() {
    this.resetRedeemCoupon();
    this.setData({ isShowRedeemCouponModal: false });
  },

  showCouponExplainModal() {
    this.setData({ isShowCouponExplainModal: true });
  },

  hideCouponExplainModal() {
    this.setData({ isShowCouponExplainModal: false });
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

  // 礼物列表 scrollTop
  setGiftOrderListScrollTop(e) {
    clearTimeout(this.setGiftOrderListScrollTopTimer);
    this.setGiftOrderListScrollTopTimer = setTimeout(() => {
      this.setData({
        giftOrderListScrollTop: e.detail.scrollTop
      });
    }, 500);
  },

  /**
   * 设置优惠券列表 scrollTop
   */
  setCouponListScrollTop(e) {
    clearTimeout(this.setCouponListScrollTopTimer);
    this.setCouponListScrollTopTimer = setTimeout(() => {
      this.setData({
        couponListScrollTop: e.detail.scrollTop
      });
    }, 500);
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

    this.couponStatusIndex = index;
    this.init();
    this.setData({
      'navTabs.status': status,
      currentTabIndex: index,
    });
  },

  // 根据优惠券种类跳转
  goUse(e) {
    const item = e.currentTarget.dataset.item;
    let url;

    if (item.shelf_type) {
      url = item.shelf_type === 'activity' ? Config.ROUTE.ACTIVITY : Config.ROUTE.BRAND;
      url += '?id=' + item.shelf_id;
    } else {
      if (item.applicable_product.length) {
        url = Config.ROUTE.DETAIL + 'id=' + item.pplicable_product[0];
      } else {
        url = Config.ROUTE.HOME
        wx.switchTab({
          url
        })
        return
      }
    }

    wx.navigateTo({
      url
    });
  },

  navToHome() {
    App.navToHome();
  },
});
