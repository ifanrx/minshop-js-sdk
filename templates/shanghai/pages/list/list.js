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
    navTabs: {
      bindtapName: 'toggleTab',
      tabs: ['默认', '最新', '最热'],
      status: [Config.NAV_TAB_ACTIVE_CLASS, '', '']
    },

    scrollTop: 0,
    currentTabIndex: 0,

    shelfList: [],
    productList: [],

    isLoadingMore: false,
    isNoMoreProductList: false,
    isFixed: false,
    wxExt: Config.WX_EXT,
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

    this.setData({
      'navTabs.status': status,
      currentTabIndex: index,
      scrollTop: 0
    });

    setTimeout(() => {
      this.setData({
        scrollTop: 1
      });
    }, 10);

    switch (this.data.currentTabIndex) {
      case 0:
        this.initProductList(ORDER_BY.DEFAULT);
        break;
      case 1:
        this.initProductList(ORDER_BY.NEW);
        break;
      case 2:
        this.initProductList(ORDER_BY.HOT);
        break;
    }
  },

  onLoad(options) {
    const shelfId = options.id;
    const shelfName = options.name;

    App.getIsFromShare(options, this);

    App.getAffid(options);
    App.getShoppingCart(this);
    // this.setReduceCostInfo(options);

    this.shelfId = shelfId;

    this.shelfName = shelfName;
    this.getCurrentShelf(shelfId).then(res => {
      App.gaScreenView('分类货架 ' + res.name);
    });

    this.initProductList(ORDER_BY.DEFAULT);
  },

  setReduceCostInfo(options) {
    const coupon = options.coupon;
    if (coupon) {
      wx.setStorageSync('coupon', coupon);
    }
  },

  onReady() {
    if (this.shelfName) {
      wx.setNavigationBarTitle({
        title: this.shelfName
      });
    }
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
      this.setData({
        productList: Utils.formatePrices(App.shelfProductList[shelfId])
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
      const productList = res.data[shelfId];
      Utils.formatePrices(productList);
      this.setData({
        productList
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
        this.setData({
          productList
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

  /**
   * 获取当前货架信息，取得当前货架名设置标题栏
   */
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
    let path = Config.ROUTE.LIST + '?id=' + this.shelfId + '&name=' + this.shelfName;
    path = App.setSharePath(path);

    return {
      title: this.shelfName,
      path: path
    }
  }
});
