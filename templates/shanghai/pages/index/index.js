import Config from '../../utils/config';
import GA from '../../utils/ga.js';
import Utils from '../../utils/utils';
import { Promise } from '../../utils/rsvp';
import { countdown } from '../../utils/index';
import toast from '../../templates/toast/toast.js';

const App = getApp();
let oldIndex = 1;
let change = false;

Page({
  data: {
    bannerSwiper: Config.BANNER_SWIPER,
    serviceGuarantees: Config.SERVICE_GUARANTEES,
    latestProductShelfId: Config.LATEST_PRODUCT_SHELF_ID,
    promotionalProductShelfId: Config.PROMOTIONAL_PRODUCT_SHELF_ID,

    bannerList: [],
    selectionProductList: [],
    shelfList: [],
    shelfProductList: [],

    isInitShelfProductList: true,
    showMoreCategory: false,
    currentIndex: 1,
    currentActIndex: 1,

    toastModalText: ''
  },

  onLoad(options) {
    App.getAffid(options);
    App.getShoppingCart(this);
    this.init();

    App.gaScreenView('首页');
  },

  onShow() {
    console.log('当前页面栈数 => ', getCurrentPages().length);
  },

  init() {
    wx.showNavigationBarLoading();
    this.timer = null;
    Promise.all([
      this.getBannerList(),
      this.getFlashSaleInfo(),
      // this.getProductList(),
      this.getShelfList(),
      this.queryCategories()
    ]).catch(err => {
      wx.showModal({
        title: '网络似乎出了问题',
        content: '点击确定自动刷新',

        success: res => {
          if (res.confirm) {
            this.init();
          }
        }
      });
    }).finally(res => {
      wx.hideNavigationBarLoading();
    });
  },

  /**
   * 获取 Banner 列表
   */
  getBannerList() {
    return App.request({
      url: Config.API.BANNER_QUERY,
      data: {
        limit: 10,
        img_size: 'medium',
        // platform: 'mobile',
        order_by: '-priority',
        banner_type: 'banner'
      },
    }).then(res => {
      const bannerList = res.data.objects || [];
      Utils.addProductURLtoBanners(bannerList);

      App.setSwiperIndicatorDots(bannerList, this);

      this.setData({
        bannerList
      });
    });
  },

  /**
   * 获取新品,特惠商品列表
   */
  getProductList(shelfIds) {
    return App.request({
      url: Config.API.SHELF_PRODUCT_QUERY,
      data: {
        id__in: shelfIds,
        limit: 20,
        img_size: 'small',
        order_by: Config.ORDER_BY.DEFAULT
      },
    }).then(res => {
      let selectionProductList = [].concat.apply([], Object.keys(res.data).map(k => res.data[k] || []))
      let promotionalProductList = res.data[this.data.promotionalProductShelfId] || [];

      selectionProductList = Utils.formatePrices(selectionProductList);
      promotionalProductList = Utils.formatePrices(promotionalProductList);

      this.setData({
        selectionProductList,
        promotionalProductList
      });
    });
  },

  /**
   * 获取货架列表
   */
  getShelfList() {
    const SHELF_TYPES = Config.SHELF_TYPES;
    const activityShelf = [];
    const vendorShelf = [];
    let categoryProductShelf = [];

    return App.request({
      url: Config.API.SHELF_QUERY,
      data: {
        img_size: 'medium',
        limit: 1000
      }
    }).then(res => {
      let shelfList = res.data.objects || [];
      shelfList = Utils.formateShelfsDescription(shelfList);
      shelfList.forEach(item => {
        switch (item.shelf_type) {
          case SHELF_TYPES.ACTIVITY:
            activityShelf.push(item);
            break;
          case SHELF_TYPES.VENDOR:
            vendorShelf.push(item);
            break;
        }
      })

      // const shelfIds = categoryShelf.map(shelf => {
      //   return shelf.id;
      // }).join(',');

      // this.shelfIds = shelfIds;
      // this._getShelfProductList(shelfIds);

      this.setData({
        shelfList,
        activityShelf,
        vendorShelf
      });
    });
  },

  queryCategories() {
    return App.request({
      url: Config.API.CATEGORY_QUERY,
      data: {
        limit: 100,
        offset: 0,
        order_by: Config.ORDER_BY.DEFAULT
      }
    }).then(res => {
      let categories = res.data.objects || [];
      let shelfIds = [];

      categories.forEach(item => {
        if (item.shelves.length) {
          shelfIds.push(item.shelves[0].id)
        }
      })

      shelfIds = shelfIds.join(',');
      this._getShelfProductList(shelfIds);

      this.getProductList(shelfIds);
      this.setData({
        categories
      });

    }).catch(err => {
      if (App.isAuthorized()) {
        wx.showModal({
          title: '网络似乎出了问题',
          content: '点击确定自动刷新',

          success: res => {
            if (res.confirm) {
              this.queryCategories();
            }
          }
        });
      }
    });
  },

  /**
   * 获取每个分类货架下的商品列表
   * @param {Array} shelfIds 货架列表
   */
  _getShelfProductList(shelfIds) {
    return App.request({
      url: Config.API.SHELF_PRODUCT_QUERY,
      data: {
        id__in: shelfIds,
        items_per_shelf: Config.HOME_PRODUCT_LIST_LIMIT,
        order_by: Config.ORDER_BY.DEFAULT,
        img_size: 'medium'
      }
    }).then(res => {
      const shelfProductList = res.data || {};
      for (let key in shelfProductList) {
        Utils.formatePrices(shelfProductList[key]);
      }

      this.setData({
        shelfProductList
      });

      this.setIsInitShelfProductList(true);
    }).catch(err => {
      this.setIsInitShelfProductList(false);
    });
  },

  /**
   * 重新加载点击的货架
   */
  reloadShelfProduct(e) {
    const timeoutId = Utils.showLoadingToast('加载中...');

    this._getShelfProductList(this.shelfIds).then(res => {
      Utils.hideLoadingToast(timeoutId);
    }).catch(err => {
      Utils.hideLoadingToast(timeoutId, {
        title: '网络似乎出了问题',
        content: '点击确定自动刷新',

        success: res => {
          if (res.confirm) {
            this.reloadShelfProduct();
          }
        }
      });
    });
  },

  /**
   * 设置是否已成功初始化货架商品列表，当值为 false 时，显示“重新加载”
   * @param {Boolean} boolean
   */
  setIsInitShelfProductList(boolean) {
    this.setData({ isInitShelfProductList: boolean });
  },

  /**
   * 跳转到搜索页
   */
  navToSearch() {
    wx.navigateTo({
      url: Config.ROUTE.SEARCH
    });
  },

  /**
   * 分享配置
   */
  onShareAppMessage() {
    return {
      title: Config.WX_EXT.MERCHANT_NAME,
      desc: Config.WX_EXT.MERCHANT_DESC,
      path: App.setSharePath(Config.ROUTE.HOME)
    }
  },

  // 切换显示商品分类
  toggleCategory() {
    let showMoreCategory = this.data.showMoreCategory;
    this.setData({
      showMoreCategory: !showMoreCategory
    })
  },

  // 切换 banner 样式
  swiperChange(e) {
    this.setData({
      currentIndex: e.detail.current + 1
    })
  },

  // 切换活动推荐序号
  activityIndexChange(e) {
    let oldCurrentActIndex = oldIndex;
    let scollLeft = e.detail.scrollLeft - Utils.rpx2px(24);
    let MIDLINE = Utils.rpx2px(260);
    let perWidth = Utils.rpx2px(504);
    let IntIndex = Math.floor(scollLeft / perWidth);
    let remainLeft = scollLeft % perWidth;
    let currentActIndex = IntIndex + 1 || 1;

    if (remainLeft >= MIDLINE) {
      currentActIndex += 1;
    }

    if (currentActIndex !== oldCurrentActIndex) {
      oldIndex = currentActIndex;
      this.setData({
        currentActIndex
      })
    }
  },

  enterCategoryDetail(e) {
    const index = e.currentTarget.dataset.index;
    const { categories } = this.data;
    const category = categories[index]

    wx.setStorageSync('category', category);

    wx.navigateTo({
      url: Config.ROUTE.CATEGORY_DETAIL
    })
  },

  // 页面滚动动画
  onPageScroll(obj) {
    let animation = wx.createAnimation({
      duration: 400,
      timingFunction: 'linear'
    });

    this.animation = animation;

    if (obj.scrollTop >= Utils.rpx2px(450) && !this.change) {
      this.animation.backgroundColor('#fff').step();
      this.setData({
        animationData: animation.export(),
        dark: true
      })
      this.change = true;
    }

    if (obj.scrollTop < Utils.rpx2px(450) && this.change) {
      this.animation.backgroundColor('transparent').step();
      this.setData({
        animationData: animation.export(),
        dark: false
      })
      this.change = false;
    }
  },

  // 获取秒杀活动
  getFlashSaleInfo() {
    return App.request({
      url: Config.API.FLASH_SALE
    }).then(res => {
      const activities = res.data.activity;
      const currentFlashSaleId = res.data.cur_activity_id;
      let currentFlashSale;

      activities.forEach(item => {
        if (item.activity_id == currentFlashSaleId) {
          currentFlashSale = Object.assign({}, item);
          currentFlashSale.product.forEach(p => {
            p.original_price = Number(p.original_price);
            p.price = Number(p.price);
            p.percent = Math.floor(100 - p.sale_percent) / 100;
          })
        }
      })

      if (currentFlashSale && currentFlashSale.time_remaining) {
        countdown(this, Math.abs(currentFlashSale.time_remaining));

        this.setData({
          currentFlashSale
        })
      }


    }).catch(err => {

    });
  }
});
