import Config from '../../utils/config';
import Utils from '../../utils/utils';

const App = getApp();

const tabBar = [{
  name: '首页',
  class: 'tabBar-item__index',
  iconClass: 'icon-home coolbuy-icon',
  active: false,
  link: 'index/index'
}, {
  name: '分类',
  class: 'tabBar-item__shelf',
  iconClass: 'icon-category coolbuy-icon',
  active: false,
  link: 'category/category'
}, {
  name: '购物车',
  class: 'tabBar-item__shopping-cart',
  iconClass: 'icon-shopping-cart coolbuy-icon',
  active: false,
  link: 'shopping-cart/shopping-cart'
}, {
  name: '我的',
  class: 'tabBar-item__user-center',
  iconClass: 'icon-mine coolbuy-icon',
  active: false,
  link: 'user-center/user-center'
}];

const changeTabBar = (e) => {
  const index = e.currentTarget.dataset.index;
  wx.redirectTo({
    url: '../' + tabBar[index].link
  })
};

const init = (page, index) => {
  const route = page.__route__;

  for (let i = 0; i < tabBar.length; i++) {
    if (route.indexOf(tabBar[i].link) !== -1) {
      tabBar[i].active = true;
    } else {
      tabBar[i].active = false;
    }
  }

  page.changeTabBar = changeTabBar;

  page.setData({
    tabBar
  });

  const userCenterRout = Utils.transAbsRoute(Config.ROUTE.USER_CENTER).slice(1);
  if (route === userCenterRout) {
    App.getShoppingCart(page);
  }
};

module.exports = { init };
