import Config from '../../utils/config';

const App = getApp();

Page({
  data: {
    vendorShelf: []
  },

  onLoad(options) {
    App.getAffid(options);
    App.getShoppingCart(this);
    this.getShelfList();

    App.gaScreenView('品牌馆');
  },

  /**
   * 获取货架列表
   */
  getShelfList() {
    wx.showNavigationBarLoading();

    App.request({
      url: Config.API.SHELF_QUERY,
      data: {
        img_size: 'small',
        limit: 1000
      }
    }).then(res => {
      const vendorShelf = [];
      const SHELF_TYPES = Config.SHELF_TYPES;
      let shelfList = res.data.objects;

      shelfList.forEach(item => {
        if (item.shelf_type === SHELF_TYPES.VENDOR) {
          vendorShelf.push(item);
        }
      })

      this.setData({
        vendorShelf
      });
    }).catch(err => {
      wx.showModal({
        title: '网络似乎出了问题',
        content: '点击确定自动刷新',

        success: res => {
          if (res.confirm) {
            this.getShelfList();
          }
        }
      });
    }).finally(res => {
      wx.hideNavigationBarLoading();
    });

  },

  /**
   * 跳转到搜索页
   */
  navToSearch() {
    wx.navigateTo({
      url: Config.ROUTE.SEARCH,
    });
  }
});
