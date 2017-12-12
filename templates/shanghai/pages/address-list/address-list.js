import Config from '../../utils/config';
import Utils from '../../utils/utils';

import CONSTANTS from '../../utils/constants';

const App = getApp();

Page({
  data: {
    addressList: [],
    isEmptyAddressList: false,
    isShowAddressCreateMethod: false,
  },

  onLoad() {
    this.init();
    App.gaScreenView('我的地址');
  },

  onShow() {
    this.getAddressList();
  },

  init() {
    Utils.showLoadingToast('加载中...');
    this.getAddressList();
    Utils.delayHideToast();
  },

  /**
   * 点击编辑地址按钮
   */
  addressEdit(e) {
    wx.navigateTo({
      url: Config.ROUTE.ADDRESS_FORM + '?id=' + e.target.id
    });
  },

  /**
   * 删除地址
   */
  addressDelete(e) {
    const addressId = e.target.id;

    wx.showModal({
      content: '确定要删除该地址吗',
      success: res => {
        if (res.confirm) {
          App.request({
            url: Config.API.ADDRESS_OPERATION,
            method: 'DELETE',
            data: {
              addressId
            }
          }).then(res => {
            this.getAddressList();
          });
        }
      }
    });
  },

  /**
   * 判断当前微信版本是否支持调用微信地址
   */
  addressCreate() {
    if (wx.chooseAddress) {
      this.toggleAddressCreateMethod();
    } else {
      this.addressCreateHandle();
    }
  },

  /**
   * 手动添加地址，跳转到添加地址页
   */
  addressCreateHandle() {
    wx.navigateTo({
      url: '../address-form/address-form'
    });
  },

  /**
   * 获取地址列表
   */
  getAddressList() {
    App.request({
      url: Config.API.ADDRESS_QUERY
    }).then(res => {
      const addressList = res.data.objects || {};

      if (addressList.length) {
        const addressesSort = addressList.sort((a, b) => {
          return (Number(b.is_default) - Number(a.is_default)) || (b.id - a.id);
        });

        this.setData({
          addressList: addressesSort,
          isEmptyAddressList: false
        });
      } else {
        this.setData({
          isEmptyAddressList: true
        });
      }
    }).catch(err => {
      wx.showModal({
        title: '网络似乎出了问题',
        content: '点击确定自动刷新',

        success: res => {
          if (res.confirm) {
            this.getAddressList();
          }
        }
      });
    });
  },

  /**
   * 设为默认地址
   */
  setDefaultAddress(e) {
    let address = {};

    const addressId = e.currentTarget.id;
    const addressList = this.data.addressList;

    addressList.forEach(item => {
      if (item.id == addressId) {
        address = item;
      }
    });

    if (!address.is_default) {
      App.request({
        url: Config.API.ADDRESS_OPERATION,
        method: 'PUT',
        data: {
          addressId,
          name: address.name,
          phone: address.phone,
          province: address.province,
          city: address.city,
          district: address.district,
          address: address.address,
          is_default: true
        },
      }).then(res => {
        const newAddresses = addressList.map(item => {
          if (item.id == addressId) {
            item = res.data;
          } else {
            item.is_default = false;
          }
          return item;
        });

        const newAddressesSort = newAddresses.sort((a, b) => {
          return (Number(b.is_default) - Number(a.is_default)) || (b.id - a.id);
        });

        this.setData({
          addressList: newAddressesSort
        });
      });
    }
  },

  /**
   * 切换显示新增地址方式弹框
   */
  toggleAddressCreateMethod() {
    this.setData({
      isShowAddressCreateMethod: !this.data.isShowAddressCreateMethod
    });
  },

  /**
   * 使用微信地址
   */
  useWxAddress() {
    wx.chooseAddress({
      success: res => {
        App.request({
          url: Config.API.ADDRESS_QUERY,
          method: 'POST',
          data: {
            name: res.userName,
            phone: res.telNumber,
            province: res.provinceName,
            city: res.cityName,
            district: res.countyName,
            address: res.detailInfo,
            is_default: true
          },
        }).then(res => {
          this.getAddressList();
        });
      }
    });
  },
});
