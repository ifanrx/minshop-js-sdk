import CONFIG from '../../utils/config'
import Pay from '../../utils/pay'
import Utils from '../../utils/utils'

import CONSTANTS from '../../utils/constants'
import { COUPON_BG } from '../../images/base64-images'
import { weCropper, polyfill } from '../../utils/index'

const App = getApp()

const UserGiftdata = {
  id: 'cropper',
  width: 720,
  height: 538,
  minScale: 1,
  maxScale: 2.5
}

Page({
  data: {
    paymentLoading: false,
    productList: [],
    totalPrice: 0,
    currentAddress: {},
    addressList: [],
    paymentMethod: 'weixin_weapp',
    errorMsg: '',
    successTag: 'success',
    failTag: 'fail',
    giftMessage: '',

    isShowCouponList: false,
    couponList: [],
    selectedCoupon: {},
    availableCouponTotalCount: '',

    isSupportChooseAddress: false,
    isShowGiftExplainBtn: false,

    navTabs: {
      bindtapName: 'toggleTab',
      tabs: ['直接购买', '赠送好友'],
      status: [CONFIG.NAV_TAB_ACTIVE_CLASS, '']
    },
    currentTabIndex: 0,

    currentCourierIds: {},

    etcGiftTemps: CONSTANTS.etcGiftTemps,
    UserGiftdata,
    currentGiftTempIndex: null,
    showUploadGift: false,
    userImg: false,
    hideGiftInfoBtn: {
      checked: false
    },

    COUPON_BG
  },

  onLoad(options = {}) {
    this.isRefreshAddress = false;

    this.isVirtualProduct(options)
    this.initBuyMethod(options)
    this.preRender()


    App.gaScreenView('订单结算');
  },

  preRender() {
    Promise.all([
      this.getIsSupportChooseAddress(),
      this.getAddress(),
      this.queryProductInfo()
    ]).then(() => {
      if (this.virtual == false) {
        this.queryShippingRate(true).then(() => {
          this.initCouponInfo()
          this.initFinalCost()
        })
        return
      }
      this.initCouponInfo()
      this.initFinalCost()
    })
  },

  onShow() {
    if (this.isRefreshAddress) {
      const currentAddressStr = wx.getStorageSync('current_address');
      let currentAddressId;

      if (currentAddressStr) {
        currentAddressId = JSON.parse(currentAddressStr).id
      }
      // this.getAddress(currentAddressId);

      this.preRender()

      this.isRefreshAddress = false;
    }
  },

  onHide() {
    wx.setStorageSync('current_address', '');
    this.isRefreshAddress = true;
  },

  onUnload() {
    App.storage.set(CONSTANTS.STORAGE_KEY.AVAILABLE_COUPON_LIST, {});
  },

  // 初始化购买方式
  initBuyMethod(options) {
    const buyMethod = options.buyMethod || '';

    if (buyMethod === CONFIG.BUY_METHOD.GIFT_GIVING) {
      this.setData({
        currentTabIndex: 1,
        'navTabs.status': ['', CONFIG.NAV_TAB_ACTIVE_CLASS],
        isShowGiftExplainBtn: true
      });
    }
  },

  // 判断是否虚拟商品
  isVirtualProduct(options) {
    this.virtual = options.virtual ? true : false

    this.setData({
      virtual: this.virtual
    })
  },

  // 初始化优惠券
  initCouponInfo() {
    const couponListObj = App.storage.get(CONSTANTS.STORAGE_KEY.AVAILABLE_COUPON_LIST);
    const couponList = couponListObj.objects || [];
    const availableCouponTotalCount = couponListObj.meta && couponListObj.meta.total_count || 0;

    // 如果有可用的 coupon，则默认选中第一张
    if (couponList.length) {
      couponList[0].selected = true;
      this.setData({
        couponList,
        selectedCoupon: couponList[0],
        availableCouponTotalCount
      });
    }
  },

  // 初始化总价
  initFinalCost() {
    const productList = this.data.productList
    const totalPrice = this.getTotalPrice(productList)
    const finalCost = this.getFinalCost(productList)

    this.setData({
      totalPrice,
      finalCost,
    })
  },

  // 查询结算 sku 信息
  queryProductInfo() {
    const skuInfo = App.storage.get(CONSTANTS.STORAGE_KEY.SKU_TO_PAY)
    const productSkus = skuInfo.map(item => item.product_sku_id).join(',')

    return App.request({
      url: CONFIG.API.CHECKOUT,
      data: {
        sku_id__in: productSkus
      }
    }).then(res => {
      let productList = res.data.order_item.map((item, index) => {
        item.quantity = skuInfo[index].quantity
        return item
      })
      this.setData({
        productList
      })
    })
  },

  // GA
  gaEcommerceCheckout(gaCategory, gaAction) {
    const gaProductList = this.data.productList.map(item => {
      return {
        id: item.product,
        name: item.title,
        price: item.unit_price,
        quantity: item.quantity,
        variant: item.spec_str,
      }
    });
    App.gaEcommerceCheckout(gaProductList, 2, gaCategory, gaAction);
  },

  // 切换购买方式
  toggleTab(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const tabs = this.data.navTabs.tabs;
    const status = [];

    for (let i = 0; i < tabs.length; i++) {
      if (i === index) {
        status.push(CONFIG.NAV_TAB_ACTIVE_CLASS);
      } else {
        status.push('');
      }
    }

    this.setData({
      'navTabs.status': status,
      currentTabIndex: index
    });

    switch (this.data.currentTabIndex) {
      case 0:
        this.setData({ isShowGiftExplainBtn: false });
        break;

      case 1:
        this.setData({ isShowGiftExplainBtn: true });
        break;
    }
  },

  // 支付前置
  paySubmit(e) {
    const currentTabIndex = this.data.currentTabIndex;
    const isMysterious = this.data.hideGiftInfoBtn.checked;
    const currentGiftTempIndex = this.data.currentGiftTempIndex;
    const formId = e.detail.formId;

    if (!this.data.currentAddress.id && currentTabIndex == 0) {
      wx.showModal({
        content: '请先添加收货地址'
      });
      return;
    }

    if (isMysterious === true && currentGiftTempIndex === null) {
      wx.showModal({
        content: '请选择礼盒'
      });
      return;
    }

    let memoErrCount = 0;
    this.data.productList.forEach(item => {
      item.memo_schema && item.memo_schema.forEach(memo => {
        if (memo.required == true){
          if (!memo.value){
            memoErrCount += 1
          }
        }
      })
    })

    if (memoErrCount > 0) {
      wx.showModal({
        title: '请填写所有带*号信息',
        showCancel:false
      })
      return
    }

    if (!this.virtual) {
      const verifyAddressSupport = this.verifyAddressSupport()

      if (verifyAddressSupport.result == false) {
        wx.showModal({
          content: verifyAddressSupport.errMsg,
          showCancel: false
        });
        return
      }
    }

    const productItems = [];
    const productList = this.data.productList
    const currentCourierIds = this.data.currentCourierIds

    this.setData({
      paymentLoading: true
    });

    productList.forEach(item => {
      let obj = {};
      obj.product_sku_id = item.product_sku_id;
      obj.quantity = item.quantity;
      obj.user_message = item.user_message || '';
      obj.memo = []
      item.memo_schema && item.memo_schema.forEach(scm => {
        obj.memo.push({
          display_name: scm.display_name,
          value: scm.value,
        })
      })
      if (this.virtual == false) {
        obj.courier_id = currentCourierIds[item.product_sku_id]
      }

      productItems.push(obj);
    });

    const coupons = [];
    const selectedCoupon = this.data.selectedCoupon;

    if (selectedCoupon.id) {
      coupons.push(selectedCoupon.id);
    }

    if (currentTabIndex === 0) {
      this.payHandle(productItems, coupons, formId);
    } else if (currentTabIndex === 1) {
      this.payForGift(productItems, coupons, formId);
    }
  },

  // 正常支付
  payHandle(productItems, coupons, formId) {
    let data = {
      payment_method: 'weixin_weapp',
      items: productItems,
      coupons: coupons,
      form_id: formId
    }

    if (!this.virtual) {
      data.address_book_id = this.data.currentAddress.id
    }

    App.request({
      url: CONFIG.API.ORDER_QUERY,
      method: 'POST',
      data
    }).then(res => {
      const orderId = res.data.orderid;
      const finalCost = res.data.final_cost;

      this.gaEcommerceCheckout('普通订单支付', 'click');

      Pay.pay(orderId, this.data.productList, finalCost, () => {
        this.setData({
          paymentLoading: false
        });
      });
    }).catch(err => {
      const errMsg = err.data
      console.log(errMsg.error_message)
      this.showErrorModal(errMsg.error_message)
    });
  },

  // 送礼支付
  payForGift(productItems, coupons, formId) {
    const currentGiftTempIndex = this.data.currentGiftTempIndex;
    const isMysterious = this.data.hideGiftInfoBtn.checked;
    const message = this.data.giftMessage;
    let cover = '';

    if (currentGiftTempIndex !== null) {
      cover = this.data.etcGiftTemps[currentGiftTempIndex].img;
    }

    App.request({
      url: CONFIG.API.GIFT_ORDER,
      method: 'POST',
      data: {
        payment_method: 'weixin_weapp',
        items: productItems,
        coupons: coupons,
        cover: cover,
        message: message,
        is_mysterious: isMysterious,
        form_id: formId
      }
    }).then(res => {
      const orderResult = res.data;
      const orderId = orderResult.orderid;
      const signedId = orderResult.gift_order.signed_id;
      const finalCost = orderResult.final_cost;

      Pay.payForGift(orderId, signedId, this.data.productList, finalCost, () => {
        this.setData({
          paymentLoading: false
        });
      });

      this.gaEcommerceCheckout('送礼订单支付', 'click');
    }).catch(err => {
      const errMsg = err.data
      this.showErrorModal(errMsg.error_message);
    });
  },

  // 保存用户留言信息
  userMessageInput(e) {
    const currentInputValue = e.detail.value.trim() || '';
    const index = e.currentTarget.dataset.index;
    const productList = this.data.productList;
    productList[index].user_message = currentInputValue;

    this.setData({
      productList
    });
  },

  // 错误弹框
  showErrorModal(errorMsg) {
    wx.showModal({
      content: errorMsg,
      showCancel: false,
      success: res => {
        if (res.confirm) {
          this.setData({
            paymentLoading: false
          });
        }
      }
    });
  },

  // 计算商品总价
  getTotalPrice(productList) {
    let totalPrice = 0;

    productList.forEach(item => {
      totalPrice += Utils.toCent((item.unit_price * item.quantity)) / 100;
    });

    return Utils.strip(totalPrice);
  },

  // 计算最终付款
  getFinalCost(productList) {
    const selectedCoupon = this.data.selectedCoupon;
    const shippingInfo = this.data.shippingInfo

    let finalCost = this.getTotalPrice(productList);

    console.log('shippingInfo', this.data.shippingInfo)
    if (!this.virtual && this.data.currentTabIndex == 0) {
      finalCost += shippingInfo.shipping_rate;
    }

    if (selectedCoupon.id) {
      const selectedCouponFaceValue = selectedCoupon.face_value;
      finalCost -= selectedCouponFaceValue;

      if (finalCost < 0) {
        finalCost = 0;
      }
    }


    return Utils.strip(finalCost);
  },

  // 获取地址
  getAddress(currentAddressId) {
    return App.request({
      url: CONFIG.API.ADDRESS_QUERY,
    }).then(res => {
      const addressList = res.data.objects || [];

      if (addressList.length) {
        let currentAddress;
        const addressListSort = addressList.sort((a, b) => {
          return (Number(b.is_default) - Number(a.is_default)) || (b.id - a.id);
        });

        if (currentAddressId) {
          addressListSort.forEach(item => {
            if (item.id == currentAddressId) {
              currentAddress = item;
            }
          });
        } else {
          currentAddress = addressListSort[0];
        }

        this.setData({
          currentAddress,
          addressList: addressListSort
        });

      }
    });
  },

  // 打开地址选择框
  changeAddress() {
    this.setData({ isShowAddressList: true });
  },

  // 改变地址
  changeAddressHandle(e) {
    var index = e.currentTarget.dataset.index;
    this.addressSelect(index);
    this.cancelSelectAddress();
  },

  // 选择地址
  addressSelect(index) {
    const currentAddress = this.data.addressList[index];
    console.log(currentAddress)
    this.setData({
      currentAddress
    })
    this.queryShippingRate(true).then(() => {
      const finalCost = this.getFinalCost(this.data.productList);
      this.setData({
        finalCost
      })
    })
  },

  // 取消选择地址
  cancelSelectAddress() {
    this.setData({
      isShowAddressList: false
    });
  },

  // 判断是否支持 `wx.chooseAddress` API
  getIsSupportChooseAddress() {
    this.setData({
      isSupportChooseAddress: !!wx.chooseAddress
    });
  },

  // TODO
  addAddress() {
    if (wx.chooseAddress) {
      this.toggleAddressCreateMethod();
    } else {
      this.addAddressHandle();
    }
  },

  //
  toggleAddressCreateMethod() {
    this.setData({
      isShowAddressCreateMethod: !this.data.isShowAddressCreateMethod
    });
  },

  // 使用用户微信地址
  useWxAddress() {
    wx.chooseAddress({
      success: res => {
        App.request({
          url: CONFIG.API.ADDRESS_QUERY,
          method: 'POST',
          data: {
            name: res.userName,
            phone: res.telNumber,
            province: res.provinceName,
            city: res.cityName,
            district: res.countyName,
            address: res.detailInfo,
            is_default: true
          }
        }).then(res => {
          const currentAddressId = res.data.id

          this.getAddress(currentAddressId);
          this.cancelSelectAddress();
        });
      }
    });
  },

  // TODO
  addAddressHandle() {
    wx.navigateTo({
      url: CONFIG.ROUTE.ADDRESS_FORM
    });
  },

  // 编辑地址
  editAddress(e) {
    const addressId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: CONFIG.ROUTE.ADDRESS_FORM + '?id=' + addressId
    });
  },


  // 显示送礼说明
  showExplainModal() {
    this.setData({ isShowExplainModal: true });
  },

  // 隐藏送礼说明
  hideExplainModal() {
    this.setData({ isShowExplainModal: false });
  },

  // 点击优惠券
  selectCoupon(e) {
    const index = e.currentTarget.dataset.index;
    const couponList = this.data.couponList;
    let selectedCoupon = couponList[index];

    selectedCoupon.selected = !selectedCoupon.selected;

    if (!selectedCoupon.selected) {
      selectedCoupon = {};
    }

    couponList.forEach((item, oindex) => {
      if (oindex != index) {
        item.selected = false;
      }
    });

    this.setData({
      couponList,
      selectedCoupon
    });
  },

  // 显示优惠券列表
  showCouponList() {
    this.setData({ isShowCouponList: true });
  },

  // 隐藏优惠券列表，同时计算 finalCost
  hideCouponList() {
    const productList = this.data.productList;
    const finalCost = this.getFinalCost(productList);
    this.setData({
      finalCost,
      isShowCouponList: false
    });
  },

  // 选择电子礼盒
  selectGiftTemp(e) {
    let currentGiftTempIndex = e.target.dataset.index;
    let etcGiftTemps = this.data.etcGiftTemps.map(val => {
      val.selected = false;
      return val;
    });

    etcGiftTemps[currentGiftTempIndex].selected = true;

    this.setData({
      currentGiftTempIndex,
      etcGiftTemps,
    })
  },

  // 添加自定义礼盒
  addUserGiftTemp() {
    let self = this;
    setTimeout(() => {
      self.setData({
        showUploadGift: true
      })
    }, 3000)

    wx.chooseImage({
      count: 1, // 默认9
      sizeType: ['original', 'compressed'], // 可以指定是原图还是压缩图，默认二者都有
      sourceType: ['album', 'camera'], // 可以指定来源是相册还是相机，默认二者都有
      success: (res) => {
        let src = res.tempFilePaths[0]
        //  获取裁剪图片资源后，给data添加src属性及其值
        Object.assign(UserGiftdata, { src })
        new weCropper(UserGiftdata);
      }
    })
  },

  // 移动礼物礼盒图片：开始
  touchStart(e) {
    this.wecropper.touchStart(e)
  },

  // 移动礼物礼盒图片
  touchMove(e) {
    this.wecropper.touchMove(e)
  },

  // 移动礼物礼盒图片：结束
  touchEnd(e) {
    this.wecropper.touchEnd(e)
  },

  // 获取裁剪礼盒图片
  getCropperImage() {
    let that = this;
    let etcGiftTemps = this.data.etcGiftTemps;
    const sessionkey = App.storage.get(CONSTANTS.STORAGE_KEY.SESSION_KEY);

    wx.showLoading({
      title: '上传中',
    })

    this.wecropper.getCropperImage().then(res => {
      wx.uploadFile({
        url: CONFIG.API_HOST + CONFIG.API.UPLOAD_IMG_URL + '?sessionkey=' + sessionkey, //仅为示例，非真实的接口地址
        filePath: res,
        header: Utils.processHeader(),
        name: 'image',
        success: function (res) {
          const data = JSON.parse(res.data);

          etcGiftTemps = etcGiftTemps.map(val => {
            val.selected = false;
            return val;
          });

          etcGiftTemps.unshift({
            img: data.path,
            name: '自定义电子礼盒',
            selected: true
          })

          that.setData({
            showUploadGift: false,
            userImg: true,
            etcGiftTemps,
            currentGiftTempIndex: 0
          })

          wx.hideLoading();
        },

        fail: function (err) {
          wx.hideLoading();
          wx.showModal({
            title: '网络似乎出了问题',
            content: '请稍后重试'
          });
        }
      })

    })
  },

  // 上传图片
  uploadTap() {
    wx.hideLoading();
    this.setData({
      showUploadGift: false
    })
  },

  // 隐藏礼物信息（匿名礼盒）
  hideGiftInfo() {
    let hideGiftInfoBtn = this.data.hideGiftInfoBtn;
    hideGiftInfoBtn.checked = !hideGiftInfoBtn.checked;

    this.setData({
      hideGiftInfoBtn
    })
  },

  // 送礼留言 handler
  messageEnter(e) {
    let giftMessage = e.detail.value;
    this.setData({
      giftMessage
    })
  },

  // 设置弹框动画
  setModalStatus: function (e) {

    let animation = wx.createAnimation({
      duration: 200,
      timingFunction: "linear",
      delay: 0
    })

    this.animation = animation
    animation.translateY(300).step()

    this.setData({
      animationData: animation.export()
    })

    if (e.currentTarget.dataset.status == 1) {
      const skuId = e.currentTarget.dataset.item.product_sku_id
      this.setData({
        currentSkuId: skuId,
        showModalStatus: true
      })
    }

    setTimeout(function () {
      animation.translateY(0).step()

      this.setData({
        animationData: animation
      })

      if (e.currentTarget.dataset.status == 0) {
        this.setData({
          showModalStatus: false
        })
      }
    }.bind(this), 200)
  },

  // 选择物流类型
  shippingTypeChange(e) {
    const currentCourierId = e.currentTarget.dataset.courierid
    const currentCourier = e.currentTarget.dataset.courier
    const currentSkuId = this.data.currentSkuId
    let currentCouriers = this.data.currentCouriers
    let currentCourierIds = this.data.currentCourierIds

    const verifyAddressSupport = this.verifyAddressSupport()

    if (verifyAddressSupport.result == false) {
      wx.showModal({
        content: verifyAddressSupport.errMsg,
        showCancel: false
      });
      return
    }

    Object.assign(currentCourierIds, {
      [currentSkuId]: currentCourierId
    })

    Object.assign(currentCouriers, {
      [currentSkuId]: currentCourier
    })

    this.setData({
      currentCouriers,
      currentCourierIds
    })
    this.queryShippingRate().then(() => {
      const finalCost = this.getFinalCost(this.data.productList);
      this.setData({
        finalCost
      })
    })
    this.setModalStatus(e)
  },

  // 查询组合运费费用
  queryShippingRate(init) {
    const url = CONFIG.API.SHIPPING_RATE
    const productList = this.data.productList
    let currentCourierIds = this.data.currentCourierIds

    let skuIds = []
    let quantities = []
    let courierIds = []

    productList.forEach(item => {
      skuIds.push(item.product_sku_id)
      quantities.push(item.quantity)
    })

    const data = {
      sku_id__in: skuIds.join(','),
      quantity__in: quantities.join(','),
      address_id: this.data.currentAddress.id
    }

    // 选择了配送方式，再次查询
    if (!init) {
      skuIds = Object.keys(currentCourierIds)
      courierIds = polyfill.values(currentCourierIds)
      console.log(currentCourierIds)
      Object.assign(data, {
        sku_id__in: skuIds.join(','),
        courier_id__in: courierIds.join(',')
      })
    }

    return App.request({
      url,
      data,
    }).then(res => {
      const shippingInfo = res.data

      if (init) {
        this.initCurrentCourierInfo(shippingInfo)
      }

      this.setData({
        shippingInfo
      })
    })
  },

  // 初始化物流信息
  initCurrentCourierInfo(shippingInfo) {
    const courier = shippingInfo.courier
    let currentCouriers = {}
    let currentCourierIds = {}

    for (let c in courier) {
      if (courier[c].length > 0) {
        currentCouriers[c] = courier[c][0]
        currentCourierIds[c] = courier[c][0].id
      }
    }

    this.setData({
      currentCouriers,
      currentCourierIds
    })
  },

  // 校验用户信息
  verifyUserInfo(memo, value) {
    const productList = this.data.productList
    const emailRegx = /^[a-z0-9]+([._\\-]*[a-z0-9])*@([a-z0-9]+[-a-z0-9]*[a-z0-9]+.){1,63}[a-z0-9]+$/
    const phoneRegx = /^1[34578]\d{9}$/
    const idRegx = /(^\d{15}$)|(^\d{17}([0-9]|X)$)/
    let result = true
    let content = ''
    let regx = ''

    switch (memo.format) {
      case 'email':
        regx = emailRegx
        break
      case 'national_id':
        regx = idRegx
        break
      case 'mobile_phone':
        regx = phoneRegx
        break
    }

    if (regx && !regx.test(value)) {
      content = `请填写正确的${memo.display_name}`
      result = false
    }

    return { result, content}
  },

  // 用户输入 handler
  bindChange(e) {
    const currentInputValue = e.detail.value
    const { oindex, index, oitem } = e.currentTarget.dataset
    const productList = this.data.productList;
    const { result, content } = this.verifyUserInfo(oitem, currentInputValue)

    productList[index].memo_schema[oindex].errMsg = content ? content : ''
    productList[index].memo_schema[oindex].value = result ? currentInputValue : ''

    this.setData({
      productList
    });
  },

  // 校验地址支持情况
  verifyAddressSupport() {
    const courier = this.data.shippingInfo.courier
    const productList = this.data.productList

    let result = true
    let errMsg = ''

    for (let c in courier) {
      if (courier[c].length <= 0) {
        productList.forEach(item => {
          if (item.product_sku_id == c) {
            errMsg = `有商品不在配送范围内，请重选商品进行结算`
          }
        })
        result = false
      }
    }
    return {
      result,
      errMsg
    }
  }


})
