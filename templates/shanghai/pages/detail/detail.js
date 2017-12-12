import Config from '../../utils/config'
import CONSTANTS from '../../utils/constants'
import Utils from '../../utils/utils'

import { skuStatus, countdown } from '../../utils/index'
import { ProductAction } from '../../utils/ga.js';

const App = getApp();

Page({
  data: {
    BUY_METHOD: Config.BUY_METHOD,
    bannerSwiper: Config.BANNER_SWIPER,

    navTabs: {
      bindtapName: 'changeNavTab',
      tabs: ['图文详情', '规格参数', '品牌描述'],
      status: ['detail-nav-tab-active', '', '']
    },
    currentTab: 0,

    detail: {},
    description: [],
    descriptionImages: {},
    currentSku: {},
    inUseSpecs: {},
    amount: 1,
    currentIndex: 1,

    isShowBox: false,
    isShowQandA: false,

    minDiscountPrice: 0,
    maxDiscountPrice: 0,
    minOriginalPrice: 0,
    maxOriginalPrice: 0,

    isMultipleSku: false,
    isOriginalPriceShow: false,
    hasOriginalPriceArea: false,
    hasDiscountPriceArea: false,
    isSupportContactButton: wx.canIUse('button.open-type.contact'),

    canOp: false, // 可操作,
    isShowPreferentialModal: false
  },

  onLoad(options) {
    this.id = options.id;
    this.init(this.id);
    this.preRender(options);

    App.getAffid(options);
    App.getIsFromShare(options, this);
  },

  preRender(options) {
    const detail = {
      id: options.id || 0,
      title: options.title || '',
      summary: options.summary || '',
      original_price: parseFloat(options.original_price, 10) || 0,
      price: parseFloat(options.price, 10) || 0,
      images: [],
    };

    if (options.img) {
      detail.images.push(options.img);
    }

    this.setData({
      isOriginalPriceShow: detail.price < detail.original_price,
      detail,
    });

    const title = detail.title;
    if (title) {
      wx.setNavigationBarTitle({
        title
      });
    }
  },

  onShow() {
    this.init(this.id)
    console.log('当前页面栈数 => ', getCurrentPages().length);
    this.getShoppingCart();
  },

  init(id) {
    this.getDetail(id).then((res) => {
      this.setTitle();
      this.setFlashSale();
      this.getRecommendationList();
      this.initSkuList()
      this.getProductCoupon(id);
      this.getDescription(id);
      this.isgettingCoupon = false;
    });
  },

  /**
   * 设置 navtab 的切换
   */
  changeNavTab(e) {
    const index = e.currentTarget.dataset.index;
    if (this.data.currentTab == index) {
      return;
    }

    const tabs = this.data.navTabs.tabs;
    let status = [];

    for (let i = 0; i < tabs.length; i++) {
      if (i == index) {
        status.push('detail-nav-tab-active');
      } else {
        status.push('');
      }
    }

    this.setData({
      'navTabs.status': status,
      currentTab: index
    });
  },

  /**
   * 获取商品优惠券信息
   * @param {Number} id 商品 id
   */
  getProductCoupon(id) {
    const url = Config.API.PRODUCT_COUPON;
    const data = { productId: id };

    App.request({
      url,
      data
    }).then(res => {
      let data = res.data;
      let coupons = [];

      for (let key in data) {
        let item = Object.assign(data[key], {
          id: key
        });

        coupons.push(item);
      }

      coupons = Utils.formatCouponListValidTime(coupons);

      let displayCoupons = coupons.slice(0, 3);

      displayCoupons = displayCoupons.map(item => {
        return item.minimum_amount > 0 ? `满${item.minimum_amount}减${item.face_value}` : `直减${item.face_value}`
      }).join('、');

      this.setData({
        coupons,
        displayCoupons
      })
    })
  },

  /**
   * 获取商品详细信息
   * @param  {Number} id 商品 id
   */
  getDetail(id) {
    const userProfile = App.storage.get(CONSTANTS.STORAGE_KEY.USER_PROFILE) || {};
    const sessionid = App.storage.get(CONSTANTS.STORAGE_KEY.SESSION_KEY) || '';
    const uid = userProfile.user_id;
    const header = {};

    if (uid) {
      header.Cookie = 'uid=' + uid;
    }

    if (sessionid) {
      header.Cookie = 'sessionid=' + sessionid;
    }

    return App.request({
      url: Config.API.PRODUCT_DETAIL,
      data: {
        productId: id,
        img_size: 'medium'
      },
      header: header
    }).then(res => {
      const detail = res.data || {};

      const banner = detail.images;
      const collected = detail.liked;

      this.setData({
        banner,
        detail,
        collected,
        canOp: true,
      });

      App.setSwiperIndicatorDots(detail.images, this);
      App.gaScreenView('商品详情 ' + detail.title);

      this._setNovelty(detail.novelty_index);
      this._setInUseSpecs(detail.in_use_specs);
      this._setSkuList(detail.sku_list);
      this._setPricesArea(detail.sku_list);

      console.log('gaEcommerce => ' + ProductAction.ACTION_DETAIL);
      App.gaEcommerce({
        id: detail.id,
        name: detail.title,
        brand: (detail.vender && detail.vender.name) || '',
        price: detail.price,
      }, ProductAction.ACTION_DETAIL, '商品详情', 'view', detail.title);

      return detail;
    });
  },

  /**
   * 获取商品的详细描述
   * @param  {Number} id 商品 id
   */
  getDescription(id) {
    App.request({
      url: Config.API.PRODUCT_DESCRIPTION,
      data: {
        productId: id
      }
    }).then(res => {
      const description = res.data.description || [];
      this.setData({
        description
      });
    });
  },

  /**
   * 获取推荐商品列表
   */
  getRecommendationList() {
    if (App.hasSessionKey() && App.isAuthorized()) {
      App.getRecommendationList(this);
    }
  },

  /**
   * 设置已选择的 sku 规格
   */
  setSelectedSku(e) {
    const keyId = e.currentTarget.dataset.keyId;
    const valueId = e.currentTarget.dataset.valueId;
    const location = [keyId, valueId]

    this.toggleSku(location)
    this.setCurrentSku()

    this.toggleFlashSale();
  },

  /**
   * 设置秒杀活动信息
   */
  setFlashSale() {
    const skuList = this.data.detail.sku_list;

    this.setData({
      isShowFlashSale: false
    })

    skuList.forEach(sku => {
      if (sku.instant_deal !== undefined) {
        this.setData({
          currentSku: sku,
          isShowFlashSale: true,
          instantDeal: sku.instant_deal
        })
        const cb = sku.instant_deal.status == 1 ? this.endFlashSale : this.reload;
        countdown(this, Math.abs(sku.instant_deal.time_remaining), cb);
        return
      }
    })
  },

  toggleFlashSale() {
    const currentSku = this.data.currentSku;
    let isShowFlashSale = currentSku.instant_deal ? true : false;
    this.setData({
      isShowFlashSale
    })
  },


  endFlashSale() {
    const that = this;
    const id = this.id;

    wx.showModal({
      content: '该商品秒杀已结束，下次请早点来抢哦～ ',
      showCancel: false,
      success: function (confirm) {
        if (confirm) {
          that.init(id)
        }
      }
    })
  },

  reload() {
    const id = this.id;
    this.init(id);
  },

  /**
   * 重新格式化 sku 列表
   * @param {[type]} specs 传入的 in_use_specs
   *
   * @example
   * inUseSpecs = {
   *   1: {
   *     spec_key_name: 'xxx',
   *     spec_vals: {
   *       2: 'xx',
   *       3: 'xx'
   *     }
   *   }
   * }
   */
  _setInUseSpecs(specs) {
    const inUseSpecs = {};

    for (let key in specs) {
      const item = specs[key];
      const spec_key_name = item.spec_key_name;
      const spec_values = {};

      for (let okey in item) {
        if (okey !== 'spec_key_name') {
          spec_values[okey] = item[okey];
        }
      }

      inUseSpecs[key] = {
        spec_key_name,
        spec_values
      }
    }

    this.setData({
      inUseSpecs
    });
  },

  setCurrentSku() {
    const skuStatusList = this.data.skuStatusList
    const skuList = this.data.detail.sku_list
    const skuId = skuStatusList.sku

    // 含有未选择规格时
    if (skuId === '') {
      return
    }

    skuList.forEach(item => {
      if (skuId == item.id) {
        this.setData({
          currentSku: item
        })
      }
    })
  },

  /**
   * 设置 sku 需要显示的信息并设置初始时默认选中的 currentSku
   * @TODO 与结算页配合，省去这一步骤
   */
  _setSkuList(skus) {
    if (skus.length < 1) {
      return;
    }

    if (skus.length === 1) {
      this.setData({
        currentSku: skus[0]
      });
    }

    let isSetCurrentSku = false;
    for (let i = 0; i < skus.length; i++) {
      // 某些 sku 会存在没有 sku_image 的情况
      skus[i].sku_image = skus[i].sku_image || this.data.detail.cover_image;

      if (!skus[i].spec_str) {
        continue;
      }

      let specStr = '';
      let specs = skus[i].spec_str.split(',');

      for (let t = 0; t < specs.length; t++) {
        if (specStr) {
          specStr += ' ' + specs[t].split(':')[1];
        } else {
          specStr += specs[t].split(':')[1];
        }
      }
      skus[i].spec = specStr;

      if (!isSetCurrentSku && skus[i].inventory > 0) {
        this.setData({
          currentSku: skus[i]
        });
        isSetCurrentSku = true;
      }
    }

    this.setData({
      'detail.sku_list': skus
    });
  },

  // 补全新奇指数
  _setNovelty(novelty) {
    if (!novelty) {
      return
    }

    novelty = novelty.toString()
    const length = novelty.length
    novelty = length > 1 ? novelty : novelty + '.0'

    this.setData({
      'detail.novelty_index': novelty
    })
  },

  /**
   * 显示底部弹窗，供用户进行购买或加入购物车的操作
   */
  showShoppingBox(e) {
    if (!this.data.canOp) return;

    if (this.data.detail.status === 'off_shelf') return

    const buyMethod = e.currentTarget.dataset.buyMethod;

    this.setData({
      buyMethod,
      isShowBox: true
    });
  },

  /**
   * 修改数量
   */
  changeQuantity(e) {
    let amount = this.data.amount;
    const currentSku = this.data.currentSku;
    const permitNum = currentSku.purchase_limit - currentSku.purchase_number;

    if (e.currentTarget.dataset.order === 'minus') {
      if (amount > 1) {
        amount -= 1;
      } else {
        return;
      }
    } else if (e.currentTarget.dataset.order === 'add') {
      if (currentSku.purchase_limit && amount > permitNum) {
        return
      }

      amount += 1;
    }

    this.setData({
      amount
    });
  },



  /**
   * 点击底部弹窗的按钮，判断是加入购物车还是马上购买
   */
  shoppingSubmit() {
    const detail = this.data.detail;
    const amount = this.data.amount;
    const currentSku = this.data.currentSku;
    const permitNum = currentSku.purchase_limit - currentSku.purchase_number;

    if (currentSku.purchase_limit && amount > permitNum) {
      return
    }

    // 有未选择的商品规格或库存不足
    if (!this.validateSelectedAllSpecs() || this.data.currentSku.inventory < this.data.amount) {
      return;
    }

    if (this.data.buyMethod === Config.BUY_METHOD.ADD_TO_SHOPPING_CART) {
      this.addToShoppingCart();
    } else {
      this.payIt();
    }
  },

  /**
   * 验证是否已选择所有商品规格
   * @return {Boolean} 已选择所有商品规格时返回 true
   */
  validateSelectedAllSpecs() {
    const inUseSpecs = this.data.inUseSpecs;
    const { sku, selected } = this.data.skuStatusList

    if (sku == '' && !Utils.isObjEmpty(inUseSpecs)) {
      for (let key in selected) {
        const name = inUseSpecs[key].spec_key_name

        if (selected[key] <= 0) {
          wx.showModal({
            showCancel: false,
            title: '提示',
            content: `请选择${name}`
          });

          return false
        }
      }
    }

    return true
  },

  /**
   * 马上购买，分自己购买和送礼
   */
  payIt() {
    if (this.isgettingCoupon) {
      return;
    }

    this.isgettingCoupon = true;

    const currentSku = this.data.currentSku;
    currentSku.title = this.data.detail.title;
    currentSku.sku_image = currentSku.sku_image || this.data.detail.cover_image;
    currentSku.quantity = this.data.amount;

    const skuIds = [currentSku.id];
    const quantities = [currentSku.quantity];

    let url = '';
    let gaCategory = '';
    if (this.data.buyMethod === Config.BUY_METHOD.BUY_NOW) {
      url = Config.ROUTE.PAY
      if (this.data.detail.product_type === 'virtual') {
        url += '?virtual=true'
      }
      gaCategory = '马上购买';
    } else if (this.data.buyMethod === Config.BUY_METHOD.GIFT_GIVING) {
      url = Config.ROUTE.PAY + '?buyMethod=' + Config.BUY_METHOD.GIFT_GIVING
      gaCategory = '送礼';
    }
    App.storage.set(CONSTANTS.STORAGE_KEY.SKU_TO_PAY, [currentSku]);

    this.getAvailableCouponTimer = Utils.showLoadingToast('');
    const orderBy = '-face_value,valid_until';
    App.getAvailableCoupon(skuIds, quantities, orderBy, this).then(res => {
      const skuInfo = [{
        quantity: currentSku.quantity,
        product_sku_id: currentSku.id
      }]

      App.storage.set(CONSTANTS.STORAGE_KEY.SKU_TO_PAY, skuInfo);
      App.storage.set(CONSTANTS.STORAGE_KEY.AVAILABLE_COUPON_LIST, res);

      console.log('gaEcommerce => ' + ProductAction.ACTION_CHECKOUT);
      const detail = this.data.detail;

      App.gaEcommerceCheckout({
        id: detail.id,
        name: detail.title,
        brand: detail.vendor.name || '',
        price: currentSku.discount_price,
        quantity: this.data.amount,
        variant: currentSku.spec_str,
      }, 1, gaCategory, 'click');

      wx.navigateTo({
        url
      });
      this.isgettingCoupon = false;
    }).catch(err => {
      this.isgettingCoupon = false;
    }).finally(res => {
      this.isgettingCoupon = false;
      wx.hideToast();
    });
  },

  /**
   * 加入购物车
   */
  addToShoppingCart() {
    const timeoutId = Utils.showLoadingToast('');

    const currentSku = this.data.currentSku;
    const shoppingCart = this.data.shoppingCart;
    const shoppingCartId = shoppingCart.id || 0;
    const products = shoppingCart.products || [];
    const skuId = currentSku.id;

    // 加入购物车，新增商品则用 POST，参数如下
    let url = Config.API.SHOPPING_CART_QUERY;
    let amount = this.data.amount;
    let method = 'POST';

    const data = {
      product_sku_id: skuId,
      quantity: amount
    };

    // 如果是已在购物车的商品，则需要用 PUT 方法，进行更新商品数量的操作
    products.forEach(item => {
      if (item.product_sku_id == skuId) {
        method = 'PUT';
        url = Config.API.SHOPPING_CART_OPERATION;
        data.shoppingCartId = shoppingCartId;
        data.quantity = amount + item.quantity;
      }
    });

    App.request({
      url: url,
      method: method,
      data: data
    }).then(res => {
      this.getShoppingCart();
      this.hideShoppingBox();
      Utils.hideLoadingToast(timeoutId);

      console.log('gaEcommerce => ' + ProductAction.ACTION_ADD);
      const detail = this.data.detail;
      App.gaEcommerce({
        id: detail.id,
        name: detail.title,
        brand: detail.vendor.name || '',
        price: currentSku.discount_price,
        quantity: amount,
        variant: currentSku.spec_str,
      }, ProductAction.ACTION_ADD, '加入购物车', 'click', detail.title);
    }).catch(err => {
      Utils.hideLoadingToast(timeoutId, {
        title: '网络似乎出了问题',
        content: '请重试~',
        showCancel: false
      });
    });
  },

  /**
   * 按比例计算图片显示宽高
   */
  imageLoad(e) {
    const realityWidth = e.detail.width;
    const realityHeight = e.detail.height;
    const proportion = realityWidth / realityHeight;

    // 设置要显示的图片宽度，图片高度按比例计算
    const viewWidth = 750;
    const viewHeight = 750 / proportion;

    const index = e.currentTarget.dataset.index;

    this.data.descriptionImages[index] = {
      width: viewWidth,
      height: viewHeight
    };

    const descriptionImages = this.data.descriptionImages;

    this.setData({
      descriptionImages
    });
  },

  /**
   * 设置价格区间并判断是否显示
   * @param {[type]} skuList [description]
   */
  _setPricesArea(skuList) {
    let isMultipleSku = false;
    let isOriginalPriceShow = false;
    let hasOriginalPriceArea = false;
    let hasDiscountPriceArea = false;

    const discountPriceList = skuList.map(function (sku) {
      return parseFloat(sku.discount_price);
    });

    const originalPriceList = skuList.map(function (sku) {
      return parseFloat(sku.original_price);
    });

    const minDiscountPrice = Math.min.apply(null, discountPriceList);
    const maxDiscountPrice = Math.max.apply(null, discountPriceList);
    const minOriginalPrice = Math.min.apply(null, originalPriceList);
    const maxOriginalPrice = Math.max.apply(null, originalPriceList);

    if (skuList.length > 1) {
      isMultipleSku = true;
    }

    if (maxOriginalPrice > minOriginalPrice) {
      hasOriginalPriceArea = true;
    }

    if (maxDiscountPrice > minDiscountPrice) {
      hasDiscountPriceArea = true;
    }

    isOriginalPriceShow = skuList.some(function (sku) {
      return Number(sku.original_price) > Number(sku.discount_price);
    });

    this.setData({
      minDiscountPrice,
      maxDiscountPrice,
      minOriginalPrice,
      maxOriginalPrice,
      isMultipleSku,
      isOriginalPriceShow,
      hasOriginalPriceArea,
      hasDiscountPriceArea
    });
  },

  /**
   * 可能在 onReady 之后网络还没有返回结果，此时每 100ms 尝试一下
   */
  setTitle() {
    const title = this.data.detail.title;

    if (title) {
      wx.setNavigationBarTitle({
        title
      });
    } else {
      setTimeout(() => {
        this.setTitle();
      }, 100);
    }
  },

  /**
   * 获取购物车数据
   */
  getShoppingCart() {
    App.getShoppingCart(this);
  },

  /**
   * 分享设置
   */
  onShareAppMessage() {
    let path = Config.ROUTE.DETAIL + '?';

    const arr = [];
    if (this.data.detail.id) {
      arr.push('id=' + this.data.detail.id);
    }
    if (this.data.detail.title) {
      arr.push('title=' + this.data.detail.title);
    }
    if (this.data.detail.summary) {
      arr.push('summary=' + this.data.detail.summary);
    }
    if (this.data.detail.price) {
      arr.push('price=' + this.data.detail.price);
    }
    if (this.data.detail.original_price) {
      arr.push('original_price=' + this.data.detail.original_price);
    }
    if (this.data.detail.images && this.data.detail.images.length > 0) {
      arr.push('img=' + this.data.detail.images[0]);
    }

    path += arr.join('&');

    path = App.setSharePath(path);

    return {
      title: this.data.detail.title,
      desc: this.data.detail.summary,
      path: path
    }
  },

  /**
   * 跳转到购物车
   */
  navToShoppingCart() {
    wx.switchTab({
      url: Config.ROUTE.SHOPPING_CART
    });
  },

  /**
   * 关闭遮罩层
   */
  hideShoppingBox() {
    this.setData({ isShowBox: false });
  },

  /**
   * 显示问答弹框
   */
  showQandA() {
    this.setData({ isShowQandA: true });
  },

  /**
   * 隐藏问答弹框
   */
  hideQandA() {
    this.setData({ isShowQandA: false });
  },

  // 收藏
  toggleCollect() {
    const productId = this.id;
    const collected = this.data.collected;
    const method = collected ? 'DELETE' : 'PUT';
    const that = this;

    return App.request({
      url: Config.API.COLLECT_PRODUCT,
      method,
      data: {
        productId,
      }
    }).then(res => {
      this.setData({
        collected: !collected
      })

      if (!collected) {
        this.showToast('收藏成功');
      } else {
        this.showToast('取消收藏');
      }
    }).catch(err => {
      if (App.isAuthorized()) {
        wx.showModal({
          title: '网络似乎出了问题',
          content: '点击确定自动刷新'
        });
      }
    });
  },

  // 模态框提示
  showToast(toastModalText = '', delay = 1000) {
    this.setData({
      toastModalStatus: true,
      toastModalText
    });

    setTimeout(() => {
      this.setData({
        toastModalStatus: false
      })
    }, delay)
  },

  // 优惠活动弹出层
  showPreferentialModal(e) {
    const index = e.currentTarget.dataset.index;

    this.setData({
      isShowPreferentialModal: true,
      currentPreferentialIndex: index
    })
  },

  // 关闭活动弹出层
  closePreferentialModal() {
    this.setData({
      isShowPreferentialModal: false
    })
  },

  // 跳转专场
  navToShelf(e) {
    const index = e.currentTarget.dataset.i;
    const { shelf_type, id } = this.data.detail.activites[index];

    const url = shelf_type === 'activity' ? Config.ROUTE.ACTIVITY : Config.ROUTE.BRAND;

    wx.navigateTo({
      url: url + '?id=' + id
    });
  },

  // 点击领取优惠券
  getCoupon(e) {
    let coupons = this.data.coupons;
    let { item, index } = e.currentTarget.dataset;
    let id = item.sequence;

    App.request({
      url: Config.API.OFFER,
      data: {
        sequenceId: id
      }
    }).then(res => {
      console.log(1111111111)
      const errMeg = res.data.status;
      coupons[index].errMeg = errMeg;

      this.setData({
        coupons
      })
    }, err => {
      console.log(err)
      const errMeg = err.data;
      coupons[index].errMeg = errMeg;

      this.setData({
        coupons
      })
    });
  },

  // 切换 banner 样式
  swiperChange(e) {
    this.setData({
      currentIndex: e.detail.current + 1
    })
  },

  // spu 限购提醒
  showPurchaseLimit() {
    const purchaseLimit = this.data.detail.purchase_limit
    const purchaseNumber = this.data.detail.purchase_number
    let title = ''

    if (purchaseNumber <= 0) {
      title = `该商品限购${purchaseLimit}件哦`
    }else {
      title = `该商品限购${purchaseLimit}件,您已经购买了${purchaseNumber}件，不能再添加了哦`
    }
    wx.showModal({
      title,
      showCancel: false
    })
  },

  initSkuList() {
    const sku = this.data.detail.sku_list
    this.toggle = skuStatus(sku)

    const skuStatusList = this.toggle()

    this.setData({
      skuStatusList
    })
  },

  toggleSku(location) {
    const sku = this.data.detail.sku_list

    const skuStatusList = this.toggle(location)

    console.log(skuStatusList)
    this.setData({
      skuStatusList
    })
  }

});
