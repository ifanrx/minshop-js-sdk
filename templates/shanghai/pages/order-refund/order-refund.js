import Config from '../../utils/config';
import Utils from '../../utils/utils';
import Constants from '../../utils/constants';

const App = getApp();
Page({
  data: {
    refundReasonList: [],
    refundReasonIndex: 0,
    refundTypes: Config.REFUND_TYPE,
    remianLength: '',
    formData: {
      refund_type: '',
      description: '',
      image_urls: [],
      order_item_id: null,
      reason: '',
      refund_amount: 0
    }
  },

  onLoad: function (option) {
    let refundItem = JSON.parse(option.refundItem);
    let refundTypes = this.data.refundTypes;
    let formData = this.data.formData;
    let refundReasonIndex = this.data.refundReasonIndex;
    let refundReasonList = Config.REFUND_REASON.map(item => {
      return item.str;
    })
    refundItem.spec = this.setSpec(refundItem.spec_str);

    // 修改申请
    if (option.modify) {
      refundTypes.map(item => {
        if (item.value === refundItem.refund_type) {
          item.checked = true;
        }
        return item;
      })

      refundReasonList.forEach((item, i) => {
        if (item === refundItem.reason) {
          refundReasonIndex = i;
        }
      })

      formData = {
        refund_type: refundItem.order_item.refund_type,
        description: refundItem.description,
        image_urls: refundItem.image_urls,
        order_item_id: refundItem.order_item.id,
        reason: Config.REFUND_REASON[refundReasonIndex].code,
        refund_amount: refundItem.refund_amount
      }

      refundItem = refundItem.order_item;
    } else {
      formData.order_item_id = refundItem.id;
    }

    this.setData({
      refundTypes: refundTypes,
      refundReasonIndex: refundReasonIndex,
      formData: formData,
      refundItem: refundItem,
      refundReasonList: refundReasonList
    })

    App.gaScreenView('售后申请');
  },

  // 退款类型
  radioChange: function (e) {
    let formData = this.data.formData;
    formData['refund_type'] = e.detail.value;
    this.setData({
      formData: formData
    })
  },

  // 退款原因
  bindPickerChange: function (e) {
    let index = e.detail.value;
    let refundReasonList = this.data.refundReasonList;
    let formData = this.data.formData;
    formData['reason'] = Config.REFUND_REASON[index].code;

    this.setData({
      refundReasonIndex: e.detail.value,
      formData: formData
    })
  },

  // 退款金额
  inputAmountHandler(e) {
    let formData = this.data.formData;
    let refundAmount = e.detail.value;
    formData['refund_amount'] = refundAmount;

    this.setData({
      formData: formData
    })
  },

  // 上传图片
  uploadImage() {
    const sessionkey = App.storage.get(Constants.STORAGE_KEY.SESSION_KEY);
    let formData = this.data.formData;
    let that = this;

    wx.chooseImage({
      success: function (res) {
        var tempFilePaths = res.tempFilePaths
        wx.uploadFile({
          url: Config.API_HOST + Config.API.UPLOAD_IMG_URL + '?sessionkey=' + sessionkey, //仅为示例，非真实的接口地址
          filePath: tempFilePaths[0],
          header: Utils.processHeader(),
          name: 'image',
          success: function (res) {
            var data = JSON.parse(res.data);
            formData.image_urls.push(data.path);
            that.setData({
              formData: formData
            })
          },
          fail: function (err) {
            wx.showModal({
              title: '网络似乎出了问题',
              content: '请稍后重试'
            });
          }
        })
      }
    })
  },

  replaceImage(e) {
    let that = this;
    let index = e.target.dataset.index;
    let formData = this.data.formData;
    const sessionkey = App.storage.get(Constants.STORAGE_KEY.SESSION_KEY);

    wx.chooseImage({
      success: function (res) {
        var tempFilePaths = res.tempFilePaths
        wx.uploadFile({
          url: Config.API_HOST + Config.API.UPLOAD_IMG_URL + '?sessionkey=' + sessionkey, //仅为示例，非真实的接口地址
          filePath: tempFilePaths[0],
          header: Utils.processHeader(),
          name: 'image',
          success: function (res) {
            var data = JSON.parse(res.data);
            formData.image_urls.splice(index, 1, data.path);
            that.setData({
              formData: formData
            })
          },
          fail: function (err) {
            wx.showModal({
              title: '网络似乎出了问题',
              content: '请稍后重试'
            });
          }
        })
      }
    })
  },

  // 计算字符剩余
  textNumCompute(e) {
    const MAXLENGTH = 140; // 最大字数
    let formData = this.data.formData;
    let description = e.detail.value;
    let len = description.length;
    let remianLength = MAXLENGTH - len;
    formData['description'] = description;

    this.setData({
      remianLength: remianLength,
      formData: formData
    })
  },

  // 表单验证
  validate() {
    let formData = this.data.formData;
    let refundItem = this.data.refundItem;

    // 退款类型验证
    if (!formData.refund_type) {
      this.validatePop('请选择退款类型');
      return false;
    }

    // 退款原因验证
    if (!formData.reason) {
      this.validatePop('请选择退款原因');
      return false;
    }

    if (formData.refund_amount == 0 && typeof formData.refund_amount !== "number") {
      this.validatePop('请填写您实际需要的退款金额');
      return false;
    }

    if (formData.refund_amount > refundItem.final_cost) {
      this.validatePop('退款金额不可超过实付款');
      return
    }

    if (!formData.description) {
      this.validatePop('请输入退款说明');
      return false;
    }

    return true;

  },

  // 提交申请
  comfirmRefund() {
    let formData = this.data.formData;
    let refundItem = this.data.refundItem;
    let orderId = refundItem.orderid;

    if (!this.validate()) {
      return;
    }

    App.request({
      url: Config.API.REFUND_OPERATION,
      data: formData,
      method: 'POST',
    }).then(res => {
      wx.showModal({
        title: '您的售后申请已经提交审核',
        content: '如需退货，请48小时内联系客服获取退货地址。',
        showCancel: false,
        complete: function () {
          wx.reLaunch({
            url: Config.ROUTE.USER_CENTER,
          })
        }
      })
    }).catch(err => {
      wx.showModal({
        title: '网络似乎出了问题',
        content: '请稍后重试'
      });
    });

  },

  // 格式化商品规格
  setSpec(spec) {
    let specStr = '';

    if (!spec) {
      return specStr;
    }

    let specs = spec.split(',');
    for (let t = 0; t < specs.length; t++) {
      if (specStr) {
        specStr += ' / ' + specs[t].split(':')[1];
      } else {
        specStr += specs[t].split(':')[1];
      }
    }
    return specStr;
  },

  // 弹窗组件
  validatePop(text) {
    wx.showModal({
      title: '提示',
      content: text,
      showCancel: false
    })
  }
})
