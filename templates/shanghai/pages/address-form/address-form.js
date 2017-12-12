import CHINA_REGION from '../../common/address';
import CONFIG from '../../utils/config';

const App = getApp();

const _filter = pid => {
  const result = [];
  for (const code in CHINA_REGION) {
    if (CHINA_REGION.hasOwnProperty(code) && CHINA_REGION[code][1] === pid) {
      result.push([code, CHINA_REGION[code][0]]);
    }
  }
  return result;
};

Page({
  data: {
    addressData: {
      name: '',
      phone: '',
      province: '',
      city: '',
      district: '',
      address: '',
      is_default: false,
    },
    errMsg: '',
  },

  onLoad(options) {
    const addressId = options.id;

    if (!addressId) {
      this.provinces = _filter('086');
      const provincesName = this.provinces.map(item => {
        return item[1];
      });

      this.setData({
        provincesName
      });
      return;
    }

    this.addressId = addressId;
    App.request({
      url: CONFIG.API.ADDRESS_OPERATION,
      method: 'GET',
      data: {
        addressId
      },
    }).then((res) => {
      const addressData = res.data;
      this.initPickers(addressData);
    });
  },

  onReady() {
    let title = '';
    if (!this.addressId) {
      title = "新增地址";
    } else {
      title = "修改地址";
    }
    wx.setNavigationBarTitle({
      title
    });
    App.gaScreenView(title);
  },

  /**
   * 编辑地址时初始化地址 pickers 组件
   * @param {Object} addressData
   */
  initPickers(addressData) {
    let provinceIndex;
    let citiesName;
    let cityIndex;
    let districtsName;
    let districtIndex;

    this.provinces = _filter('086');
    const provincesName = this.provinces.map(item => {
      return item[1];
    });

    provincesName.forEach((item, index) => {
      if (item === addressData.province) {
        provinceIndex = index;
        this.cities = _filter(this.provinces[provinceIndex][0]);
        citiesName = this.cities.map(item => {
          return item[1];
        });
      }
    });

    citiesName.forEach((item, index) => {
      if (item === addressData.city) {
        cityIndex = index;
        this.districts = _filter(this.cities[cityIndex][0]);
        districtsName = this.districts.map(item => {
          return item[1];
        });
      }
    });

    districtsName.forEach((item, index) => {
      if (item === addressData.district) {
        districtIndex = index;
      }
    });

    this.setData({
      addressData,
      provincesName,
      provinceIndex,
      citiesName,
      cityIndex,
      districtsName,
      districtIndex,
    });
  },

  getInputValue(e) {
    const filed = e.currentTarget.dataset.filed;
    const inputValue = e.detail.value.trim() || '';

    this.setData({
      ['addressData.' + filed]: inputValue,
    });
  },

  bindProvinceChange(e) {
    let index = e.detail.value;
    const provinceIndex = this.data.provinceIndex;

    // 兼容旧版本中 picker 组件的异常返回值
    if (index === "null") {
      if (provinceIndex === undefined) {
        index = 0;
      } else {
        index = provinceIndex;
      }
    }

    this.cities = _filter(this.provinces[index][0]);
    this.districts = _filter(this.cities[0][0]);

    const citiesName = this.cities.map(item => {
      return item[1];
    });

    const districtsName = this.districts.map(item => {
      return item[1];
    });

    this.setData({
      'addressData.province': this.data.provincesName[index],
      'addressData.city': citiesName[0],
      'addressData.district': districtsName[0],
      provinceIndex: index,
      citiesName,
      cityIndex: 0,
      districtsName,
      districtIndex: 0,
    })
  },

  bindCityChange(e) {
    const index = e.detail.value;
    this.districts = _filter(this.cities[index][0]);
    const districtsName = this.districts.map(item => {
      return item[1];
    });

    this.setData({
      'addressData.city': this.data.citiesName[index],
      'addressData.district': districtsName[0],
      cityIndex: index,
      districtsName,
      districtIndex: 0,
    })
  },

  bindDistrictChange(e) {
    const index = e.detail.value;
    this.setData({
      'addressData.district': this.data.districtsName[index],
      districtIndex: index,
    })
  },

  toggleDefault(e) {
    this.setData({
      'addressData.is_default': !(String(e.currentTarget.dataset.default) === 'true')
    });
  },

  handleSubmit() {
    const validatedRes = this.validate();
    if (validatedRes) {
      wx.showModal({
        content: validatedRes,
        showCancel: false
      });
      return;
    }

    const addressId = this.addressId;
    const addressData = this.data.addressData;

    let url = CONFIG.API.ADDRESS_QUERY;
    let method = 'POST';

    if (addressId) {
      url = CONFIG.API.ADDRESS_OPERATION;
      method = 'PUT';
      addressData.addressId = addressId;
    }

    App.request({
      url,
      method,
      data: addressData
    }).then(res => {
      if (addressId) {
        const currentAddress = JSON.stringify(res.data);
        wx.setStorageSync('current_address', currentAddress);
      }
      wx.navigateBack({
        delta: 1
      });
    });
  },

  validate() {
    const addressData = this.data.addressData;
    if (!(addressData.name && addressData.name.trim())) {
      return '请填写姓名';
    } else if (/^1/.test(addressData.phone) && !/^\d{11}$/.test(addressData.phone)) {
      return '请填写正确的电话号码';
    } else if (!/^(\(\d{3,4}\)|\d{3,4}-?)\d{7,8}$/.test(addressData.phone)) {
      return '请填写正确的电话号码，固话前需添加区号';
    } else if (!addressData.province) {
      return '请选择省份';
    } else if (!addressData.city) {
      return '请选择城市';
    } else if (!(addressData.address && addressData.address.trim())) {
      return '请填写详细地址';
    } else {
      return '';
    }
  },
});
