import Config from '../../utils/config';
import Utils from '../../utils/utils';

import CONSTANTS from '../../utils/constants';

const App = getApp();

Page({
  data: {
    collectionList: []
  },

  onLoad() {
    this.init();
    App.gaScreenView('我的收藏');
  },

  onShow() {
    this.init();
  },

  init() {
    Utils.showLoadingToast('加载中...');
    this.getCollectionList().then(res => {
      Utils.delayHideToast();
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
      let collectionList = res.data.objects || [];

      if (collectionList.length) {

        this.setData({
          collectionList,
          isEmptyCollectionList: false
        });
      } else {
        this.setData({
          collectionList,
          isEmptyCollectionList: true
        });
      }
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

  deleteCollectedProduct(e) {
    const productId = e.currentTarget.dataset.id;

    return App.request({
      url: Config.API.COLLECT_PRODUCT,
      method: 'DELETE',
      data: {
        productId
      }
    }).then(res => {
      this.setData({
        collectionList: []
      })
      this.init()
    }).catch(err => {
      if (App.isAuthorized()) {
        wx.showModal({
          title: '网络似乎出了问题',
          content: '点击确定自动刷新',
        });
      }
    });
  }
});
