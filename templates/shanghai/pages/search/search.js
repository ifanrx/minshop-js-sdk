var Search = require('../../utils/search.js');
var Utils = require('../../utils/utils');
var CONFIG = require('../../utils/config.js');

const App = getApp();

Page({
  data: {
    tipText: '',
    recommandList: [],
    searchList: [],
    isShowRecommand: true,
    isShowResult: false,
    isShowNotResult: false,
    isShowResult: false,
    isNotMore: false,
    scrollTop: 0
  },

  onLoad() {
    this.getRecommandList();
    App.gaScreenView('搜索');
  },

  handleInput(e) {
    clearTimeout(this.iTimer);

    let inputValue;
    let isShowResult = true;
    let isShowNotResult = false;

    this.iTimer = setTimeout(() => {
      inputValue = e.detail.value.trim();

      if (inputValue && inputValue != this.oldInputValue) {

        wx.showToast({
          title: '正在努力搜索',
          icon: 'loading',
          duration: 8000
        });

        Search.search(inputValue, res => {
          wx.hideToast();

          const searchResultCount = res.data.nbHits;
          let searchList = res.data.hits || [];
          searchList = Utils.formatePrices(searchList);
          searchList = Utils.formateShelfsDescription(searchList);

          if (!searchList.length) {
            isShowResult = false;
            isShowNotResult = true;
          }

          this.setData({
            inputValue,
            searchList,
            searchResultCount,
            isShowResult,
            isShowNotResult,
            isNotMore: false,
            isShowRecommand: false,
          });
        });
      }

      if (!inputValue) {
        this.setData({
          searchList: [],
          searchResultCount: 0,
          isShowResult: false,
          inputValue: '',
          isShowRecommand: true
        });
      }
      this.oldInputValue = inputValue;
    }, 100);
  },

  getRecommandList() {
    App.request({
      url: CONFIG.API.PRODUCT_RECOMMEND,
      data: {
        limit: 6
      }
    }).then(res => {
      let recommandList = res.data.objects || [];
      recommandList = Utils.formatePrices(recommandList);
      this.setData({
        recommandList
      });
    });
  },

  recommendChange() {
    this.getRecommandList();
  },

  navToHome() {
    App.navToHome();
  },

  loadMore() {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;

    const inputValue = this.data.inputValue;
    const isNotMoreResult = this.data.isNotMore;
    let tipText;

    if (!isNotMoreResult) {
      this.setData({
        tipText: '正在加载...'
      });
    }

    Search.searchNext(inputValue, isNotMoreResult, res => {
      let isNotMore;
      let newSearchList = res.data.hits || [];
      newSearchList = Utils.formatePrices(newSearchList);
      newSearchList = Utils.formateShelfsDescription(newSearchList);

      const searchList = this.data.searchList.concat(newSearchList);

      if (newSearchList.length === 0) {
        isNotMore = true;
        tipText = '没有更多了'
      } else {
        isNotMore = false;
        tipText = '正在加载...'
      }

      this.setData({
        searchList,
        isNotMore,
        tipText,
        isShowResult: true,
      });

      this.isLoading = false;
    });

  }
})
