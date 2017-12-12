import Config from '../../utils/config';
import Utils from '../../utils/utils';

const App = getApp();
const PRODUCT_LIST_LIMIT = Config.PRODUCT_LIST_LIMIT;

Page({
  data: {
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

    this.setData({
      currentTabIndex: index,
      scrollTop: 0
    });

    setTimeout(() => {
      this.setData({
        scrollTop: 1
      });
    }, 10);

    this.initProductList();
  },

  onLoad(options) {
    const currentTabIndex = options.index || 0;
    let category;

    if (options.id) {
      this.getCategory(options.id).then(()=>{
        this.initProductList();
      });
    }else {
      category = wx.getStorageSync('category');

      App.getIsFromShare(options, this);

      App.getAffid(options);
      App.getShoppingCart(this);

      wx.setNavigationBarTitle({
        title: category.name
      })

      this.setData({
        category
      })

      this.initProductList();
    }

    this.setData({
      currentTabIndex
    })
  },

  getCategory(id) {
    return App.request({
      url: Config.API.CATEGORY_DETAIL,
      data: {
        limit: 100,
        offset: 0,
        categoryId: id,
        order_by: Config.ORDER_BY.DEFAULT
      }
    }).then(res => {
      let category = res.data;

      wx.setNavigationBarTitle({
        title: category.name
      })

      this.setData({
        category
      })

    }).catch(err => {
      if (App.isAuthorized()) {
        wx.showModal({
          title: '网络似乎出了问题',
          content: '点击确定自动刷新',

          success: res => {
            if (res.confirm) {
              this.getCategory(id);
            }
          }
        });
      }
    });
  },

  /**
   * 初始化商品列表
   * @param  {[type]} orderBy [description]
   */
  initProductList() {
    this.offset = 0;
    this.isLoadingMore = false;
    this.isFirstTimeLoadMore = true;

    this.setData({
      scrollTop: 0,
      isNoMoreProductList: false
    });

    const { currentTabIndex, category } = this.data;
    const shelfId = category.shelves[currentTabIndex].id;

    this.loadingMoreTimer = Utils.showLoadingToast('加载中...');

    App.request({
      url: Config.API.SHELF_PRODUCT_QUERY,
      data: {
        id__in: shelfId,
        items_per_shelf: Config.HOME_PRODUCT_LIST_LIMIT,
        offset: 0,
        img_size: 'small',
        order_by: Config.ORDER_BY.DEFAULT
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
            this.initProductList();
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
    const { currentTabIndex, category } = this.data;
    const shelfId = category.shelves[currentTabIndex].id;

    let offset = this.offset + PRODUCT_LIST_LIMIT;

    if (this.isFirstTimeLoadMore) {
      offset = Config.HOME_PRODUCT_LIST_LIMIT;
    }

    App.request({
      url: Config.API.SHELF_PRODUCT_QUERY,
      data: {
        id__in: shelfId,
        items_per_shelf: PRODUCT_LIST_LIMIT,
        offset: offset,
        img_size: 'small',
        order_by: Config.ORDER_BY.DEFAULT
      }
    }).then(res => {
      const newProductList = res.data[shelfId];

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

  // 页面滚动样式
  productListScroll(e) {
    let scrollTop = e.detail.scrollTop;
    const navBarHight = Utils.rpx2px(103);

    this.setData({
      isFixed: scrollTop >= navBarHight
    })
  },

  /**
   * 分享设置
   */
  onShareAppMessage() {
    const { currentTabIndex, category } = this.data;
    let path = `${Config.ROUTE.CATEGORY_DETAIL}?category=${category}&index=${currentTabIndex}`
    path = App.setSharePath(path);

    return {
      title: category.name,
      path: path
    }
  }
});
