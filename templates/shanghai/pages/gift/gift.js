import CONFIG from '../../utils/config';
import login from '../../utils/login';
import Utils from '../../utils/utils';
import CONSTANTS from '../../utils/constants';
import CHINA_REGION from '../../common/address';

const _filter = pid => {
  const result = [];

  for (const code in CHINA_REGION) {
    if (CHINA_REGION.hasOwnProperty(code) && CHINA_REGION[code][1] === pid) {
      result.push([code, CHINA_REGION[code][0]]);
    }
  }
  return result;
};

let timer = null;

const App = getApp();

Page({
  data: {
    currentIndex: 1,
    giftInfo: {},
    productInfo: null,
    isRedeemed: false,
    isUnauthorized: false,
    description: [],
    descriptionImages: {},

    name: '',
    phone: '',
    province: '',
    city: '',
    district: '',
    address: '',
    zipcode: '',

    currentGift: 0,

    isShowAddressForm: false,
    isShowGiftPanel: true,
    animationData: {},
    isShowExplainModal: false,
    isTempHideShareTip: false,
    wxExt: CONFIG.WX_EXT,
  },
  onLoad(options) {
    const isShowGiftShareTip = options.isShowGiftShareTip;
    const signedId = options.signedId;
    let source = options.source;
    console.log(signedId);
    this.getGiftOrder(signedId);
    App.getIsFromShare(options, this);
    this.getGiftInfo(signedId);

    this.setData({
      signedId,
      isShowGiftShareTip
    });

    const provinces = _filter('086');
    const provincesName = provinces.map(function (item) {
      return item[1];
    });

    if (source === 'pay') {
      source = '支付成功';
    } else {
      source = '订单详情'
    }

    if (this.data.isFromShare) {
      source = '会话';
    }

    this.setData({
      source,
      provincesName,
      provinces
    });
    this.getIsSupportChooseAddress();

    App.gaScreenView(this.data.wxExt.MERCHANT_NAME + '礼包')
  },

  getGiftOrder(signedId) {
    App.request({
      url: CONFIG.API.GIFT_ORDER_RECEIVED
    }).then(res => {
      let GiftOrders = res.data.objects;
      console.log(GiftOrders);
      let currentGiftOrder = {};
      GiftOrders.forEach(item => {
        if (item.signed_id == signedId) {
          currentGiftOrder = item;
          this.setData({
            currentGiftOrder
          })
          return
        }
      })

    })
  },

  /**
   * 获取物流追踪信息
   */
  getTrackingInfo(e) {

    const orderItem = this.data.currentGiftOrder.items[0];

    const coverImage = orderItem.cover_image;
    const shipCarrier = orderItem.ship_carrier;
    const waybillNumber = orderItem.waybill_number;
    const trackingInfo = orderItem.tracking_info || [];
    const isMysterious = this.data.currentGiftOrder.is_mysterious;

    console.log(orderItem);
    const info = {
      coverImage,
      shipCarrier,
      waybillNumber,
      trackingInfo,
      isMysterious
    };

    App.storage.set('tracking_info', info);

    wx.navigateTo({
      url: CONFIG.ROUTE.TRACKING_INFO
    });
  },

  getGiftInfo(signedId) {
    this.timer = Utils.showLoadingToast('加载中...');
    App.request({
      url: CONFIG.API.GIFT_ORDER_QUERY,
      data: {
        signedId: signedId
      }
    }).then(res => {
      let productDetails = [];
      var giftInfo = res.data;

      if (giftInfo.gift !== undefined) {
        giftInfo.gift.forEach(item => {
          this.getDescription(item.id);
          this.getProdcutsBanner(item.id);
        });
      }

      this.setData({
        giftInfo: giftInfo
      });

      this.getIsRedeemed(giftInfo);

    }).catch(err => {
      console.log(err);
      if (App.storage.get(CONSTANTS.STORAGE_KEY.AUTHORIZED) === 'false') {
        this.setData({
          isUnauthorized: true
        });
      } else {
        wx.showModal({
          title: '提示',
          content: '网络似乎出了问题，请重试～',
          success: res => {
            if (res.confirm) {
              this.getGiftInfo(signedId);
            }
          }
        });
      }
    }).finally(res => {
      Utils.hideLoadingToast(this.timer);
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
    const viewWidth = 580;
    const viewHeight = 580 / proportion;

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
   * 获取商品的详细描述
   * @param  {Number} id 商品 id
   */
  getDescription(id) {
    App.request({
      url: CONFIG.API.PRODUCT_DESCRIPTION,
      data: {
        productId: id,
        img_size: 'medium'
      }
    }).then(res => {
      const product = res.data;
      let productInfo = this.data.productInfo || [];
      productInfo.push(product);
      this.setData({
        productInfo
      });
    });
  },

  getProdcutsBanner(id) {
    App.request({
      url: CONFIG.API.PRODUCT_DETAIL,
      data: {
        productId: id,
        img_size: 'medium'
      }
    }).then(res => {
      const banner = res.data.images;
      let productBanner = this.data.productBanner || [];
      productBanner.push(banner);

      this.setData({
        productBanner
      });
    });
  },

  getIsRedeemed(giftInfo) {
    if (giftInfo.beneficiary != undefined && giftInfo.beneficiary.redeemed_at != undefined) {
      this.setData({
        isRedeemed: true
      });
    }
  },

  onShow() {
    this.setData({
      isShowGiftPanel: true,
      isShowAddressForm: false,
      isShowExplainModal: false
    });

    this.getAddressList();

    this.animation = wx.createAnimation({
      duration: 300,
      timingFunction: 'linear'
    });

    this.animation.translateX(0).step();

    this.setData({
      animationData: this.animation.export()
    });
  },

  cancelRedeem() {
    this.hideAddressForm();
  },

  showAddressForm: function () {
    this.hideAddressList();
    this.setData({
      isShowAddressForm: true
    });

    setTimeout(() => {
      this.animation.translateX(-1000).step();
      this.setData({
        animationData: this.animation.export()
      });
    }, 50);

    setTimeout(() => {
      this.setData({
        isShowGiftPanel: false
      });
    }, 300);
  },

  hideAddressForm() {
    this.animation.translateX(0).step();

    this.setData({
      animationData: this.animation.export(),
      isShowGiftPanel: true
    });

    setTimeout(() => {
      this.setData({
        isShowAddressForm: false
      });
    }, 300);
  },

  showExplainModal() {
    this.setData({
      isShowExplainModal: true
    });

    if (this.data.isShowGiftShareTip) {
      this.setData({
        isTempHideShareTip: true
      });
    }

    if (this.data.isTempHideShareTip) {
      this.setData({
        isShowGiftShareTip: false
      });
    }
  },

  hideExplainModal() {
    this.setData({
      isShowExplainModal: false
    });

    if (this.data.isTempHideShareTip) {
      this.setData({
        isShowGiftShareTip: true
      });
    }
  },

  onShareAppMessage() {
    let path = CONFIG.ROUTE.GIFT + '?signedId=' + this.data.signedId;
    path = App.setSharePath(path);

    return {
      title: this.data.giftInfo.giver.nickname + '挑了好久，决定送你这份礼物',
      path: path
    }
  },

  showErrorModal(errorMsg) {
    wx.showModal({
      content: errorMsg,
      showCancel: false
    });
  },

  handleInput(e) {
    const filed = e.currentTarget.id;
    const inputValue = e.detail.value.trim() || '';
    const inputData = {};

    inputData[filed] = inputValue;
    this.setData(inputData);
  },

  provincePicker: function () {
    if (!this.data.provinceIndex > 0) {
      this.setData({
        provinceIndex: 0
      });
    }
  },
  bindProvinceChange: function (e) {
    var index = e.detail.value;
    var cities = _filter(this.data.provinces[index][0]);
    var citiesName = cities.map(function (item) {
      return item[1];
    });

    var districts = _filter(cities[0][0]);

    if (districts[0] == undefined) {
      districts = [
        [0, ' ']
      ];
    }

    var districtsName = districts.map(function (item) {
      return item[1];
    });

    this.setData({
      provinceIndex: index,
      province: this.data.provincesName[index],
      cityIndex: 0,
      cities: cities,
      citiesName: citiesName,
      city: citiesName[0],
      districtIndex: 0,
      districts: districts,
      districtsName: districtsName,
      district: districtsName[0]
    })
  },

  bindCityChange: function (e) {
    var index = e.detail.value;
    var districts = _filter(this.data.cities[index][0]);

    if (districts[0] == undefined) {
      districts = [
        [0, ' ']
      ];
    }

    var districtsName = districts.map(function (item) {
      return item[1];
    });

    this.setData({
      cityIndex: index,
      city: this.data.citiesName[index],
      districtIndex: 0,
      district: districtsName[0],
      districts: districts,
      districtsName: districtsName
    })
  },

  bindDistrictChange: function (e) {
    var index = e.detail.value;
    this.setData({
      districtIndex: index,
      district: this.data.districtsName[index]
    })
  },

  validate: function () {
    if (!(this.data.name && this.data.name.trim())) {
      return '请填写姓名';
    } else if (/^1/.test(this.data.phone) && !/^\d{11}$/.test(this.data.phone)) {
      return '请填写正确的电话号码';
    } else if (!/^(\(\d{3,4}\)|\d{3,4}-?)\d{7,8}$/.test(this.data.phone)) {
      return '请填写正确的电话号码，固话前需添加区号';
    } else if (!this.data.province) {
      return '请选择省份';
    } else if (!this.data.city) {
      return '请选择城市';
    } else if (!(this.data.address && this.data.address.trim())) {
      return '请填写详细地址';
    } else {
      return '';
    }
  },

  useWxAddress: function () {
    var that = this;
    wx.chooseAddress({
      success: function (res) {
        that.setData({
          name: res.userName,
          phone: res.telNumber,
          province: res.provinceName,
          city: res.cityName,
          district: res.countyName,
          address: res.detailInfo,
          zipcode: res.postalCode
        });
        wx.showModal({
          title: '确认使用以下收货地址？',
          content: that.data.name + ' ' + that.data.phone + ' ' + that.data.province + that.data.city + that.data.district + that.data.address,
          success: function (res) {
            if (res.confirm) {
              that.hideAddressList();
              that.handleSubmit();
            }
          }
        });
      }
    });
  },

  useAddressList(e) {
    const index = e.currentTarget.dataset.index;
    const addressItem = this.data.addressList[index];

    this.setData({
      name: addressItem.name,
      phone: addressItem.phone,
      province: addressItem.province,
      city: addressItem.city,
      district: addressItem.district || '',
      address: addressItem.address,
      zipcode: addressItem.zipcode
    });

    wx.showModal({
      title: '确认使用以下收货地址？',
      content: this.data.name + ' ' + this.data.phone + ' ' + this.data.province + this.data.city + this.data.district + this.data.address,
      success: res => {
        if (res.confirm) {
          this.handleSubmit();
          this.hideAddressList();
          this.hideAddressCreateMethod();
        }
      }
    });
  },

  handleSubmit() {
    const validatedRes = this.validate();
    let errorMsg = '';

    if (validatedRes) {
      this.showErrorModal(validatedRes);
      return;
    }

    const postData = {
      gift_order_id: this.data.signedId,
      form_id: this.formId,
      name: this.data.name,
      phone: this.data.phone,
      province: this.data.province,
      city: this.data.city,
      district: this.data.district || '',
      address: this.data.address,
      zipcode: this.data.zipcode || ''
    };

    App.request({
      url: CONFIG.API.GIFT_REMEED,
      method: 'POST',
      data: postData
    }).then(res => {
      this.hideAddressForm();
      this.setData({
        isRedeemed: true
      });
    }).catch(err => {
      if (err.statusCode == 400) {
        if (err.data.error_msg === 'Gift currently unavailable') {
          errorMsg = '该礼包尚未付款。';
        } else if (err.data.error_msg === 'Redeem already') {
          errorMsg = '该礼包已被领取。';
        } else if (err.data.error_msg === 'Required field missing') {
          errorMsg = '领取失败，请联系客服。';
        }
        this.showErrorModal(errorMsg);
      }
    });
  },

  navToHome() {
    App.navToHome();
  },

  closeGiftShareTip() {
    this.setData({
      isShowGiftShareTip: false,
      isTempHideShareTip: false
    });
    wx.setStorageSync('is_show_gift_share_tip', 'false');
  },

  getAddressList() {
    App.request({
      url: CONFIG.API.ADDRESS_QUERY,
    }).then(res => {
      const addressList = res.data.objects || [];

      if (addressList.length) {
        const addressListSort = addressList.sort((a, b) => {
          return (Number(b.is_default) - Number(a.is_default)) || (b.id - a.id);
        });

        this.setData({
          addressList: addressListSort,
          isAddressEmpty: false
        });
      } else {
        this.setData({
          isAddressEmpty: true
        });
      }
    });
  },

  goToRedeem() {
    if (this.data.isAddressEmpty) {
      if (wx.chooseAddress) {
        this.showAddressCreateMethod();
      } else {
        this.showAddressForm();
      }
    } else {
      this.showAddressList();
    }
  },

  redeemFormSubmit(e) {
    this.formId = e.detail.formId;
    console.log(e)
    this.goToRedeem()
  },

  // 显示地址列表
  showAddressList() {
    this.setData({
      isShowAddressList: true
    });
  },

  hideAddressList() {
    this.setData({
      isShowAddressList: false
    });
  },

  getIsSupportChooseAddress() {
    let isSupportChooseAddress = false;
    if (wx.chooseAddress) {
      isSupportChooseAddress = true;
    }
    this.setData({
      isSupportChooseAddress: isSupportChooseAddress
    });
  },

  showAddressCreateMethod() {
    this.setData({
      isShowAddressCreateMethod: true
    });
  },

  hideAddressCreateMethod() {
    this.setData({
      isShowAddressCreateMethod: false
    });
  },

  // 切换 banner 样式
  swiperChange(e) {
    console.log(e.detail.current);
    this.setData({
      currentIndex: e.detail.current + 1
    })
  },

  toggleDescriptionShow(e) {
    console.log(e)
    let currentProductIndex = e.currentTarget.dataset.index;
    let descriptionStatus = !this.data.descriptionStatus;
    this.setData({
      currentProductIndex,
      descriptionStatus
    })
  },

  chooseGift(e) {
    let index = e.currentTarget.dataset.index;
    console.log(index);
    this.setData({
      currentGift: index
    })
  }

});
