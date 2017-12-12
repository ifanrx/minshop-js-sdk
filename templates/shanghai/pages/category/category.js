import Config from '../../utils/config';
import Utils from '../../utils/utils';

import CONSTANTS from '../../utils/constants';

const App = getApp();

Page({
  data: {
    activeCategoryIndex: 0
  },

  onLoad(options) {
    App.getAffid(options);
    App.getShoppingCart(this);

    this.queryCategories();
    App.gaScreenView('分类');
  },

  onShow() {
    console.log('当前页面栈数 => ', getCurrentPages().length);
  },

  /**
   * 跳转到搜索页
   */
  navToSearch() {
    wx.navigateTo({
      url: Config.ROUTE.SEARCH
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

  toggleCategory(e) {
    const activeCategoryIndex = e.currentTarget.dataset.index;
    this.setData({ activeCategoryIndex })
  },

  enterCategoryDetail(e) {
    const index = e ? e.currentTarget.dataset.index : 0;
    const { activeCategoryIndex, categories } = this.data;
    const category = categories[activeCategoryIndex];

    wx.setStorageSync('category', category);

    wx.navigateTo({
      url: Config.ROUTE.CATEGORY_DETAIL + '?index=' + index
    })
  },

  getUrl(e) {
    let url = e.currentTarget.dataset.url;
    let bannerArr = [{ target_url: url }];
    const regx = /category/;

    if (regx.test(url)) {
      this.enterCategoryDetail();
      return;
    }

    Utils.addProductURLtoBanners(bannerArr);

    if (!bannerArr.length) return;

    url = bannerArr[0].URL;

    wx.navigateTo({
      url
    });
  }
});
