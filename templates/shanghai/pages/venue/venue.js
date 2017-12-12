import Config from '../../utils/config.js'
import Constants from '../../utils/constants'
import Utils from '../../utils/utils'
import { countdown, venueCountDown } from '../../utils/countdown'

const App = getApp();

const hotShelfId = 266;

const shelfMap = [{
  id: hotShelfId,
  title: '秒杀专区',
  module: 'module0'
}, {
  title: '新奇榜单',
  module: 'module1'
}, {
  id: 141,
  title: '潮牌特惠',
  module: 'module2',
  images: {}
}, {
  id: 142,
  title: '特色会场',
  module: 'module3',
  images: {}
}];

const giftBoxList = [{
  id: 1712,
  name: '小巨蛋T6便携茶具 Pertouch泊喜'
}, {
  id: 1778,
  name: '爱乐之橙月饼礼盒 荣锦本味'
}, {
  id: 1689,
  name: '中秋鲜花蛋糕月饼礼盒 ROSE HONEY'
}, {
  id: 1724,
  name: '陈李济陈皮红豆沙月饼礼盒'
}];

const categoriesMap = [{
  id: 275,
  categoryId: '26',
  title: '秋冬保暖',
  bgName: 'category-0',
  color: '#A778C3',
  backgroundImage: 'linear-gradient(-180deg, #BFD6FC 0%, #F8ACBC 100%)'
}, {
  id: 286,
  categoryId: '29',
  title: '数码家电',
  bgName: 'category-1',
  color: '#B566ED',
  backgroundImage: 'linear-gradient(-180deg, #8DB5F1 0%, #FEEEDE 100%)'
}, {
  id: 287,
  categoryId: '28',
  title: '服饰配件',
  bgName: 'category-2',
  color: '#E43842',
  backgroundImage: 'linear-gradient(-180deg, #FCB79F 0%, #E995AF 100%)'
}, {
  id: 288,
  categoryId: '12',
  title: '休闲美食',
  bgName: 'category-3',
  color: '#BC56A7',
  backgroundImage: 'linear-gradient(-180deg, #FCB6A0 0%, #FFEBD2 100%)'
}, {
  id: 289,
  categoryId: '30',
  title: '家居消费',
  bgName: 'category-4',
  color: '#8182CF',
  backgroundImage: 'linear-gradient(-180deg, #FEBFCE 0%, #B4E9EA 100%)'
}, {
  id: 290,
  categoryId: '31',
  title: '个护生活',
  bgName: 'category-5',
  color: '#6867AC',
  backgroundImage: 'linear-gradient(-180deg, #7DBFF6 0%, #C9E8AE 100%)'
}, {
  id: 291,
  categoryId: '5',
  title: '潮流箱包',
  bgName: 'category-6',
  color: '#5E58C3',
  backgroundImage: 'linear-gradient(-180deg, #DA95C0 0%, #BFD9FE 100%)'
}, {
  id: 292,
  categoryId: '32',
  title: '新奇文创',
  bgName: 'category-7',
  color: '#D358BB',
  backgroundImage: 'linear-gradient(-180deg, #E2D1C3 0%, #F7F2EE 100%)'
}, {
  id: 293,
  categoryId: '27',
  title: '福利专区',
  bgName: 'category-8',
  color: '#6691C6',
  backgroundImage: 'linear-gradient(-180deg, #FDDC94 0%, #D4FCFA 100%)'
}];

Page({
  data: {
    shelfMap,
    categoriesMap,
    giftBoxList,

    activityShelfList: shelfMap.slice(2),
    shelfProductList: [],
    hotShelf: {},
    hotProductList: [],
    venueModule: [],
    couponSeqs: [],

    currentModule: -1,
    activeVenueModule: -1,

    showTipModal: false,
    showNav: false,
    venueCountdownText: '距离双十一活动结束',
    isShowVenueClock: false
  },

  onLoad(options) {
    const couponSeqs = Constants.VENUE_COUPON_SEQUENCES;
    App.getAffid(options);
    App.getIsFromShare(options, this);
    this.venueCountdown()
    this.initFlashSaleInfo()
    this.getVenueModule();
    this.getHotShelfInfo();
    this.getHotProductList();
    this.getBrandList();
    this.getShelfProducts();
    this.getCouponSeqInfo(couponSeqs);

    App.gaScreenView('主会场');
  },

  onShow() {
    App.getShoppingCart(this);
  },

  getVenueModule() {
    const venueModule = shelfMap.map(item => {
      return item.title;
    });

    this.setData({
      venueModule
    });

    console.log(shelfMap);
    console.log(venueModule);
  },

  // 获取优惠券信息
  getCouponSeqInfo(couponSeqs) {
    let that = this;
    couponSeqs = couponSeqs || [];

    if (!couponSeqs.length) {
      return;
    }
    couponSeqs = couponSeqs.join(',');

    App.request({
      url: Config.API.COUPON_PUBLIC,
      data: {
        coupon_sequences: couponSeqs
      }
    }).then(res => {
      let couponSeqs = res.data.objects;
      console.log(couponSeqs);
      couponSeqs.forEach(item => {
        item.minimum_amount = item.minimum_amount ? `满${item.minimum_amount}可用` : "无门槛使用";
        item.valid_until = Utils.formatTimestamp(item.valid_until, 'ymd');
      })

      that.setData({
        couponSeqs: couponSeqs
      })
    })
  },

  venueCountdown() {
    const now = Math.floor(new Date().getTime() / 1000);
    const beginTime = new Date('Fri Nov 11 2017 00:00:00 GMT+0800 (CST)').getTime() / 1000;

    if (now >= beginTime) {
      this.setData({
        isShowVenueClock: true
      })
      venueCountDown(this)
    }
  },

  // 点击领取优惠券
  getCoupon(e) {
    console.log(e);
    let item = e.currentTarget.dataset.item;
    let id = item.sequence;
    let index = e.currentTarget.dataset.index;
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

  // 新奇榜单
  getHotShelfInfo() {
    App.request({
      url: Config.API.SHELF_QUERY + hotShelfId + '/',
      data: {
        img_size: 'medium',
      }
    }).then(res => {
      const hotShelf = res.data;

      this.setData({
        hotShelf
      })
    });
  },

  getHotProductList() {
    App.request({
      url: Config.API.SHELF_PRODUCT_QUERY,
      data: {
        id__in: hotShelfId,
        items_per_shelf: 5,
        order_by: Config.ORDER_BY.DEFAULT,
        img_size: 'small'
      }
    }).then(res => {
      const hotProductList = Utils.formatePrices(res.data[hotShelfId]);

      this.setData({
        hotProductList
      });
    })
  },

  /**
   * 获取潮牌特惠
   */
  getBrandList() {
    App.request({
      url: Config.API.SHELF_QUERY,
      data: {
        img_size: 'small',
        limit: 1000
      }
    }).then(res => {
      const brandShelf = [];
      const SHELF_TYPES = Config.SHELF_TYPES;
      let shelfList = res.data.objects;

      shelfList.forEach(item => {
        if (item.shelf_type === SHELF_TYPES.VENDOR) {
          brandShelf.push(item);
        }
      })

      this.setData({
        brandShelf: brandShelf.slice(0, 2)
      });
    }).catch(err => {
      wx.showModal({
        title: '网络似乎出了问题',
        content: '点击确定自动刷新',

        success: res => {
          if (res.confirm) {
            this.getBrandList();
          }
        }
      });
    })

  },

  getShelfProducts() {
    const activityShelfList = this.data.categoriesMap;

    const shelfIdList = activityShelfList.map(item => {
      return item.id;
    });

    // shelfIdList.forEach((id, index) => {
    //   App.request({
    //     url: Config.API.SHELF_QUERY + id + '/',
    //     data: {
    //       img_size: 'medium'
    //     },
    //   }).then(res => {
    //     activityShelfList[index].images = {
    //       header_image: res.data.header_image,
    //       background_image: res.data.background_image
    //     };
    //     this.setData({
    //       activityShelfList
    //     });
    //   });
    // });

    App.request({
      url: Config.API.SHELF_PRODUCT_QUERY,
      data: {
        id__in: shelfIdList.join(','),
        items_per_shelf: 5,
        order_by: Config.ORDER_BY.DEFAULT,
        img_size: 'small'
      }
    }).then(res => {
      const shelfProductList = res.data;

      for (let key in shelfProductList) {
        Utils.formatePrices(shelfProductList[key]);
      }

      this.setData({
        shelfProductList
      });
    })
  },

  // 切换会场模块
  selectActiveView(e) {
    let activeView = e.target.dataset.index;
    this.setData({
      activeVenueModule: activeView,
      currentModule: activeView
    })
  },

  // 切换分会场
  selectSubActiveView(e) {
    let activeView = e.target.dataset.index;
    this.setData({
      activeVenueModule: activeView
    })
  },

  // 会场滚动事件
  venueScroll(e) {
    this.scrolling = true;
    this.scrollingTimer && clearTimeout(this.scrollingTimer);
    this.scrollingTimer = setTimeout(() => {
      this.scrolling = false;
    }, 1000);

    let venueScrollTop = e.detail.scrollTop;
    console.log(Utils.px2rpx(e.detail.scrollTop));
    let showNav = this.data.showNav;

    let currentModule = this.data.currentModule || 0;
    let module1 = Utils.rpx2px(1755 - 70);
    let module2 = Utils.rpx2px(3022.5 - 70);
    let module3 = Utils.rpx2px(5625 - 70);
    let module4 = Utils.rpx2px(6338 - 70);

    if (venueScrollTop >= Utils.rpx2px(1784) && !showNav) {
      this.setData({
        showNav: true
      })
      return
    }
    if (venueScrollTop < Utils.rpx2px(1784) && showNav) {
      this.setData({
        showNav: false
      })
      return
    }

    if (venueScrollTop < module2 && currentModule !== 0) {
      this.setData({
        currentModule: 0
      })
      return
    }

    if (module2 <= venueScrollTop && venueScrollTop < module3 && currentModule != 1) {
      this.setData({
        currentModule: 1
      })
      return
    }

    if (module3 <= venueScrollTop && venueScrollTop < module4 && currentModule != 2) {
      this.setData({
        currentModule: 2
      })
      return
    }

    if (module4 <= venueScrollTop && currentModule != 3) {
      this.setData({
        currentModule: 3
      })
      return
    }

  },

  toggleTipModal(e) {
    const showTipModal = e.target.dataset.type;
    this.setData({
      showTipModal
    })
  },

  toggleTab(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const id = parseInt(e.currentTarget.dataset.id);

    this.initFlashSaleInfo(id)

    this.setData({
      currentTabIndex: index,
      scrollTop: 0
    });
  },

  initFlashSaleInfo(id) {
    let data = id ? { activity_id: id } : {};

    return App.request({
      url: Config.API.FLASH_SALE,
      data
    }).then(res => {
      console.log(res)
      if (res.data && res.data.activity && res.data.cur_activity_id) {
        let activities = this.formateActivities(res.data.activity);
        const currentFlashSaleId = res.data.cur_activity_id;
        let currentFlashSale;
        let currentTabIndex;

        activities.forEach((item, i) => {
          if (item.activity_id == currentFlashSaleId) {
            currentTabIndex = i;
            currentFlashSale = Object.assign({}, item);
            currentFlashSale.product.forEach(p => {
              p.original_price = Number(p.original_price);
              p.price = Number(p.price);
              p.percent = Math.floor(100 - p.sale_percent) / 100;
            })
          }
        })

        if (currentFlashSale && currentFlashSale.time_remaining) {
          countdown(this, Math.abs(currentFlashSale.time_remaining), this.initFlashSaleInfo);
          // todo: 这里很卡，应该是 setData 的问题，考虑用 canvas 绘图
          this.setData({
            activities,
            currentFlashSale,
            currentTabIndex,
            isNoFlash: false
          })
        }
      } else {
        this.setData({
          isNoFlash: true
        })
      }
    }).catch(err => {
      console.log(err)
      wx.showModal({
        title: '网络似乎出了问题',
        content: '点击确定自动刷新',
        success: res => {
          if (res.confirm) {
            this.initFlashSaleInfo();
          }
        }
      });
      this.isLoadingMoreProduct = false;
    });
  },

  formateActivities(activities) {
    return activities.map(item => {
      let statusStr;
      let tip;

      item.valid_from = Utils.formatTimestamp(item.valid_from, 'hm');
      item.valid_until = Utils.formatTimestamp(item.valid_until, 'hm');
      switch (item.status) {
        case 0:
          statusStr = '即将开抢';
          tip = '距离下一场还剩';
          break;
        case 1:
          statusStr = '已开抢';
          tip = '本场还剩';
          break;
        case 2:
          statusStr = '抢购中';
          tip = '本场还剩';
          break;
        case 3:
          statusStr = '已结束';
          tip = '已结束';
          break;
        case 4:
          statusStr = '已关闭';
          tip = '已关闭';
      }

      Object.assign(item, {
        statusStr,
        tip
      })

      return item
    })
  },

  /**
   * 分享配置
   */
  onShareAppMessage() {
    return {
      title: '玩物志双十一狂欢开幕，限时开抢2017元红包',
      path: App.setSharePath(Config.ROUTE.VUNUE)
    }
  },
})
