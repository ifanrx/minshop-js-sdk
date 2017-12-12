import Config from '../../utils/config';
import Utils from '../../utils/utils';

const App = getApp();
const PRODUCT_LIST_LIMIT = Config.PRODUCT_LIST_LIMIT;
const ORDER_BY = {
  DEFAULT: '-priority,-id',
  NEW: '-id',
  HOT: '-sold_count,-id'
}

Page({
  data: {
    scrollTop: 0,
    currentTabIndex: 0,
    productList: [],
    hotRecommendation: [],
    moreSelection: [],

    isLoadingMore: false,
    isNoMoreProductList: false,
    isFixed: false,
    wxExt: Config.WX_EXT,
  },

  onLoad(options) {
    const shelfId = options.id;
    const shelfName = options.name;

    App.getIsFromShare(options, this);

    App.getAffid(options);
    App.getShoppingCart(this);

    this.shelfId = shelfId;
    this.shelfName = shelfName;

    this.getCurrentShelf(shelfId).then((shelf) => {
      this.getCouponSeqInfo(shelf);
      this.initProductList(ORDER_BY.DEFAULT);

      App.gaScreenView('活动货架 ' + shelf.name);
    });
  },

  onReady() {
    if (this.shelfName) {
      wx.setNavigationBarTitle({
        title: this.shelfName
      });
    }
  },

  //获取活动货架信息
  getCurrentShelf(id) {
    let that = this;
    return App.request({
      url: Config.API.SHELF_QUERY + id,
      data: {
        img_size: 'medium',
      }
    }).then(res => {
      const shelf = res.data;

      wx.setNavigationBarTitle({
        title: shelf.name
      })

      that.setData({
        shelf
      })

      return shelf;
    });
  },

  // 获取优惠券信息
  getCouponSeqInfo(shelf) {
    let couponSeqs = JSON.parse(shelf.display_coupon_sequences) || [];

    if (!couponSeqs.length) {
      return;
    }

    couponSeqs = couponSeqs.join(',');

    App.request({
      url: Config.API.COUPON_PUBLIC,
      data: {
        limit: 100,
        coupon_sequences: couponSeqs
      }
    }).then(res => {
      let couponSeqs = res.data.objects;

      couponSeqs.forEach(item => {
        item.minimum_amount = item.minimum_amount ? `满${item.minimum_amount}可用` : "无门槛使用";
        item.valid_until = Utils.formatTimestamp(item.valid_until, 'ymd');
      })

      this.setData({
        couponSeqs
      })
    })
  },

  // 点击领取优惠券
  getCoupon(e) {
    let item = e.target.dataset.item;
    let id = item.sequence;
    let index = e.target.dataset.index;
    let couponSeqs = this.data.couponSeqs;
    let that = this;

    if (item.status === 'out_of_stock') {
      return
    }

    App.request({
      url: Config.API.OFFER,
      data: {
        sequenceId: id
      }
    }).then(res => {
      let resCode = res.statusCode;
      couponSeqs[index].resCode = resCode;

      that.setData({
        couponSeqs
      })

    }, err => {
      let errData = err.data;
      couponSeqs[index].errData = errData;

      that.setData({
        couponSeqs
      })
    })
  },

  /**
   * 初始化商品列表
   * @param  {[type]} orderBy [description]
   */
  initProductList(orderBy) {
    this.offset = 0;
    this.orderBy = orderBy;
    this.isLoadingMore = false;
    this.isFirstTimeLoadMore = true;

    this.setData({
      scrollTop: 0,
      isNoMoreProductList: false
    });

    const shelfId = this.shelfId;
    if (orderBy == ORDER_BY.DEFAULT && App.shelfProductList && App.shelfProductList[shelfId] && App.shelfProductList[shelfId].length) {
      const productList = Utils.formatePrices(App.shelfProductList[shelfId]);
      const hotRecommendation = productList.slice(0, 2);
      const moreSelection = productList.slice(2);

      this.setData({
        productList,
        hotRecommendation,
        moreSelection
      });
      Utils.hideLoadingToast(this.loadingMoreTimer);
      return;
    }

    this.loadingMoreTimer = Utils.showLoadingToast('加载中...');

    App.request({
      url: Config.API.SHELF_PRODUCT_QUERY,
      data: {
        id__in: shelfId,
        items_per_shelf: Config.HOME_PRODUCT_LIST_LIMIT,
        offset: 0,
        img_size: 'small',
        order_by: orderBy
      }
    }).then(res => {
      const productList = Utils.formatePrices(res.data[shelfId]);
      const hotRecommendation = productList.slice(0, 2);
      const moreSelection = productList.slice(2);

      this.setData({
        productList,
        hotRecommendation,
        moreSelection
      });
    }).catch(err => {
      wx.showModal({
        title: '网络似乎出了问题',
        content: '点击确定自动刷新',

        success: res => {
          if (res.confirm) {
            this.loadingMoreTimer = Utils.showLoadingToast('加载中...');
            this.initProductList(orderBy);
          }
        }
      });
    }).finally(res => {
      Utils.hideLoadingToast(this.loadingMoreTimer);
    });
  },

  /**
   * 触发加载更多
   * @return {[type]} [description]
   */
  loadMore() {
    console.log(111);
    if (this.isLoadingMore || this.data.isNoMoreProductList) {
      return;
    }

    this.isLoadingMore = true;
    this.loadingMoreTimer = Utils.showLoadingToast('加载更多...');

    this.getMoreProductList();
  },

  /**
   * 获取更多商品
   */
  getMoreProductList() {
    let offset = this.offset + PRODUCT_LIST_LIMIT;

    if (this.isFirstTimeLoadMore) {
      offset = Config.HOME_PRODUCT_LIST_LIMIT;
    }

    App.request({
      url: Config.API.SHELF_PRODUCT_QUERY,
      data: {
        id__in: this.shelfId,
        items_per_shelf: PRODUCT_LIST_LIMIT,
        offset: offset,
        img_size: 'small',
        order_by: this.orderBy
      }
    }).then(res => {
      const newProductList = res.data[this.shelfId];

      if (newProductList.length) {
        Utils.formatePrices(newProductList);
        const productList = this.data.productList.concat(newProductList);
        const hotRecommendation = productList.slice(0, 2);
        const moreSelection = productList.slice(2);

        this.setData({
          productList,
          hotRecommendation,
          moreSelection
        });
      } else {
        this.setData({
          isNoMoreProductList: true
        });
      }
      if (this.isFirstTimeLoadMore) {
        this.offset += Config.HOME_PRODUCT_LIST_LIMIT;
        this.isFirstTimeLoadMore = false;
      } else {
        this.offset += PRODUCT_LIST_LIMIT;
      }
    }).catch(err => {
      wx.showModal({
        title: '网络似乎出了问题',
        content: '点击确定自动刷新',
        success: res => {
          if (res.confirm) {
            this.getMoreProductList();
          }
        }
      });
    }).finally(res => {
      this.isLoadingMore = false;
      Utils.hideLoadingToast(this.loadingMoreTimer);
    });
  },

  // 页面滚动样式
  productListScroll(e) {
    let scrollTop = e.detail.scrollTop;
    let isFixed = false;

    if (scrollTop >= 199) {
      isFixed = true
    }

    this.setData({
      isFixed
    })
  },

  /**
   * 分享设置
   */
  onShareAppMessage() {
    let path = Config.ROUTE.ACTIVITY + '?id=' + this.shelfId + '&name=' + this.shelfName;
    path = App.setSharePath(path);

    return {
      title: this.shelfName,
      path: path
    }
  }
});
