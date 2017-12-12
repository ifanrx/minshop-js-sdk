import Config from './utils/config'
import Constants from './utils/constants'
import {HitBuilders, Product} from './utils/ga.js'
import Request from './utils/request'
import Storage from './utils/storage'
import Utils from './utils/utils'

import {Promise} from './utils/rsvp'

App({
  gaTracker: null,

  storage: Storage,
  request: Request.request,
  baseRequest: Request.baseRequest,

  onLaunch(options) {
    this.storage.set('is_show_gift_share_tip', 'true')
    wx.removeStorageSync('coupon')

    if (options.query.utm_source != undefined) {
      this.gaSource(options.query)
    } else if (options.referrerInfo && options.referrerInfo.appId) {
      this.gaSource({
        utm_source: options.referrerInfo.appId,
        utm_medium: options.scene,
      })
    }
  },

  onShow(options) {
    const appId = 'wx3661dec4a09553f1' // 立减金小程序 appId
    const query = options.query
    const queryList = [query.signature, query.type, query.scene, query.pack_id, query.act_id]
    const isMatchAppid = !!options.referrerInfo && options.referrerInfo.appId === appId

    console.log('App onShow')
    console.log(options)
    if (queryList.indexOf(undefined) === -1 && !isMatchAppid) {
      wx.navigateToMiniProgram({
        appId,
        path: `pages/index/index?signature=${query.signature}&type=${query.type}&scene=${query.scene}&pack_id=${query.pack_id}&act_id=${query.act_id}`, // eslint-disable-line
      })
    }
  },

  /**
   * 获取个人中心用户信息
   * @return {Object} 返回一个 Promise 对象
   */
  getUserProfile() {
    const userProfile = this.storage.get(Constants.STORAGE_KEY.USER_PROFILE)
    return new Promise((resolve, reject) => {
      if (userProfile) {
        resolve(userProfile)
      } else {
        this.request({
          url: Config.API.USER_PROFILE,
        }).then(res => {
          const userProfile = res.data
          this.storage.set(Constants.STORAGE_KEY.USER_PROFILE, userProfile)
          resolve(userProfile)
        }).catch(err => {
          reject(err)
        })
      }
    })
  },

  /**
   * 获取购物车列表
   * 用户未登录时先分配一个匿名 sessionkey
   * @param  {Object} page 当前页面的 Page 对象，使用时传入 this 即可
   */
  getShoppingCart(page) {
    if (this.hasSessionKey()) {
      return this.queryShoppingCart(page)
    } else {
      return new Promise((resolve, reject) => {
        wx.login({
          success: res => {
            const jsCode = res.code
            if (jsCode) {
              resolve(jsCode)
            } else {
              reject(new Error('not found'))
            }
          },
          fail: err => {
            reject(err)
          },
        })
      }).then(jsCode => {
        return this.request({
          method: 'POST',
          url: Config.API_HOST + Config.API.SESSION_INIT,
          header: Utils.processHeader(),
          data: {
            code: jsCode,
          },
        }).then(res => {
          this.storage.set(Constants.STORAGE_KEY.SESSION_KEY, res.data.token)
          return this.queryShoppingCart(page)
        })
      })
    }
  },

  /**
   * 查询购物车列表
   * 所有需要追踪来源的页面，必须在页面 onLoad 事件中调用本方法
   * @param  {Object} page 当前页面的 Page 对象，使用时传入 this 即可
   */
  queryShoppingCart(page) {
    return new Promise((resolve, reject) => {
      const baseURL = Config.API.SHOPPING_CART_QUERY

      // affid 供返利系统追踪来源使用
      const shoppingCartQureyURL = !this.affid ? baseURL : baseURL + '&affid=' + this.affid

      this.request({
        url: shoppingCartQureyURL,
      }).then(res => {
        const shoppingCart = res.data.objects[0] || {}

        page.setData({
          shoppingCart,
        })

        resolve(shoppingCart)
      }).catch(err => {
        reject(err)
      })
    })
  },

  getAuthorizedShoppingCart(page) {
    if (this.hasSessionKey()) {
      this.getShoppingCart(page)
    };
  },

  /**
   * 获取甄选商品列表
   * @param  {Object} page 当前页面的 Page 对象，使用时传入 this 即可
   */
  getRecommendationList(page) {
    this.getUserProfile().then(res => {
      const userId = res.user_id
      return this.request({
        url: Config.API.RECOMMENDATION,
        data: {
          user_id: userId,
        },
      })
    }).then(res => {
      const productIds = res.data.join(',')

      return this.request({
        url: Config.API.PRODUCT_QUERY,
        data: {
          id__in: productIds,
          limit: 20,
          img_size: 'small',
        },
      })
    }).then(res => {
      let recommendation = res.data.objects

      recommendation = Utils.formatePrices(recommendation)
      page.setData({
        recommendation,
      })
    })
  },

  /**
   * 获取可用的优惠券
   * @param  {Array} skuIds      结算的 sku_id
   * @param  {Array} quantities  每个 sku 的数量
   */
  getAvailableCoupon(skuIds, quantities, orderBy, page) {
    page.getAvailableCouponTimer = Utils.showLoadingToast('')

    return this.request({
      url: Config.API.COUPON_QUERY,
      data: {
        sku_ids: skuIds.join(','),
        quantities: quantities.join(','),
        order_by: orderBy,
      },
    }).then(res => {
      let couponList = res.data.objects
      couponList = Utils.formatCouponListValidTime(couponList)
      res.data.objects = couponList

      Utils.hideLoadingToast(page.getAvailableCouponTimer)

      return res.data
    }).catch(err => {
      if (this.isAuthorized()) {
        Utils.hideLoadingToast(page.getAvailableCouponTimer, {
          title: '网络似乎出了问题',
          content: '请重试~',
          showCancel: false,
        })
      }
      throw err
    })
  },

  /**
   * 跳转到首页
   */
  navToHome() {
    wx.switchTab({
      url: Config.ROUTE.HOME,
    })
  },

  /**
   * 设置分享路径，添加 'share=true' 参数
   * @param {[type]} relRoute 分享页面的相对路径
   */
  setSharePath(relRout) {
    const absRoute = Utils.transAbsRoute(relRout)
    let sharePath = absRoute + (absRoute.search(/\?/) === -1 ? '?' : '&')
    sharePath += 'share=true'

    return sharePath
  },

  /**
   * 判断是否从分享会话中进入小程序
   * @param {String} share 从小程序进入的值为 'true'
   * @param {Object} page 当前页面的 Page 对象，使用时传入 this 即可
   */
  getIsFromShare(options, page) {
    const isFromShare = options.share === 'true'

    page.setData({
      isFromShare,
    })
  },

  /**
   * 设置 swiper 的 indicatorDots 值，当图片数为 1 时隐藏
   * @param {Array} images 在swiper 中显示的图片
   * @param {Object} page 当前页面的 Page 对象，使用时传入 this 即可
   */
  setSwiperIndicatorDots(images, page) {
    if (images.length === 1) {
      page.setData({
        'bannerSwiper.indicatorDots': false,
      })
    }
  },

  /**
   * 判断是否已经登录
   * @return {Boolean}           [description]
   */
  hasSessionKey() {
    const sessionKey = this.storage.get(Constants.STORAGE_KEY.SESSION_KEY)
    return !!sessionKey
  },

  isAuthorized() {
    return this.storage.get(Constants.STORAGE_KEY.AUTHORIZED) === 'true'
  },

  /**
   * 获取 options 中的 affid 参数
   * 供返利追踪使用
   * @param {Object} options
   */
  getAffid(options = {}) {
    if (!options.affid) {
      return
    }

    this.affid = options.affid
  },

  /**
   * 初始化 GoogleAnalytics Tracker
   */
  getTracker() {
    /* if (!this.gaTracker) {
      this.gaTracker = GoogleAnalytics.getInstance(this)
        .setAppName('玩物志小程序')
        .setAppVersion('v3')
        .newTracker(Config.GA_TRACKING_ID);
    }
    return this.gaTracker; */
  },

  /**
   * 记录 ga 屏幕访问
   * @param {String} screenName
   */
  gaScreenView(screenName) {
    // const tracker = this.getTracker()

    /* tracker.setScreenName(screenName);
    tracker.send(new HitBuilders.ScreenViewBuilder().build()); */
  },

  /**
   * 记录 ga 事件
   * @param {String} category
   * @param {String} action
   * @param {String} label
   */
  gaEvent(category, action, label = '', value = 0) {
    // const tracker = this.getTracker()
    /* const event = new HitBuilders.EventBuilder();

    event.setCategory(category)
      .setAction(action)
      .setLabel(label)
      .setValue(value);
    tracker.send(event.build()); */
  },

  /**
   * 处理 ga 商品函数
   * @param {Object || Object[]} data 商品对象或商品列表，最终统一处理成 Object[]
   */
  gaEcommerceBase(data, category, action, label) {
    let productList = []

    const event = new HitBuilders.EventBuilder()

    const dataToString = Object.prototype.toString.call(data)

    if (dataToString === '[object Object]') {
      productList = [data]
    } else if (dataToString === '[object Array]') {
      productList = data
    }

    productList.forEach(item => {
      const product = new Product()
      // 列举所有可能填写的字段，id 和 name 必填其一，其他选填
      const recordFieldMap = ['id', 'name', 'brand', 'category', 'price', 'quantity', 'variant']

      recordFieldMap.forEach(field => {
        const capitalizeField = field.replace(/^\w/, str => str.toUpperCase())
        item[field] != undefined && product['set' + capitalizeField](item[field])
      })

      event.addProduct(product)
    })

    event.setCategory(category)
      .setAction(action)
      .setLabel(label)

    return event
  },

  /**
   * 记录 productAction 一般流程
   * @param {String} productAction
   */
  gaEcommerce(data, productAction, category, action, label = '') {
    // const tracker = this.getTracker()
    /* const _productAction = new ProductAction(productAction);

    const event = this.gaEcommerceBase(data, category, action, label);
    event.setProductAction(_productAction);
    tracker.send(event.build()); */
  },

  /**
   * 记录 ProductAction.ACTION_CHECKOUT 结算流程
   * @param {Number} checkoutStep 结算步骤 1 或 2
   */
  gaEcommerceCheckout(data, checkoutStep, category, action, label = '') {
    // const tracker = this.getTracker()
    /* const _proIductAction = new ProductAction(ProductAction.ACTION_CHECKOUT);
    _productAction.setCheckoutStep(checkoutStep);

    const event = this.gaEcommerceBase(data, category, action, label);

    event.setProductAction(_productAction);

    tracker.send(event.build()); */
  },

  /**
   * 记录 ProductAction.ACTION_PURCHASE 完成交易
   * @param {Number} orderId 订单 id
   * @param {Number} finalCost 订单支付金额
   */
  gaEcommercePurchase(data, orderId, finalCost, category, action, label = '') {
    // const tracker = this.getTracker()
    /* const _productAction = new ProductAction(ProductAction.ACTION_PURCHASE);
    _productAction.setTransactionId(orderId)
      .setTransactionAffiliation('coolbuy')
      .setTransactionRevenue(finalCost);

    const event = this.gaEcommerceBase(data, category, action, label);

    event.setProductAction(_productAction);

    tracker.send(event.build()); */
  },

  /**
   * 记录 ga 流量获取来源
   * @param {Object} query
   */
  gaSource(query) {
    // const tracker = this.getTracker()
    /* const campaignUrl = CampaignParams.parseFromPageOptions(query).toUrl();
    tracker.setCampaignParamsOnNextHit(campaignUrl); */
  },
})
