import Utils from '../../utils/utils'
import { countdown } from '../../utils/index'
import Config from '../../utils/config'

const App = getApp()

Page({

  /**
   * 页面的初始数据
   */
  data: {
    isFixed: false
  },

  onLoad: function (options) {

  },

  onReady: function () {

  },

  onShow: function () {
    this.initFlashSaleInfo();
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
      const activities = this.formateActivities(res.data.activity);
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

        this.setData({
          activities,
          currentFlashSale,
          currentTabIndex
        })
      }

    }).catch(err => {
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

  loadMore() {
    if (this.isLoadingMoreProduct || this.isNoMoreProduct) {
      return
    }


  },

  loadMoreProduct() {
    
  },

  formateActivities(activities) {
    return activities.map(item => {
      let statusStr;
      let tip;

      item.valid_from = Utils.formatTimestamp(item.valid_from, 'hm');
      item.valid_until = Utils.formatTimestamp(item.valid_until, 'hm');
      switch(item.status) {
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

  queryFlashSaleById(id) {

    return App.request({
      url: Config.API.FLASH_SALE,
      data: {
        activity_id: id
      }
    }).then(res => {
      const activities = res.data.activity;

    }).catch(err => {

    });
  },
  
  /**
   * 分享配置
   */
  onShareAppMessage() {
    return {
      title: '每天4场心跳加速',
      path: App.setSharePath(Config.ROUTE.FLASH_SALE)
    }
  },
})