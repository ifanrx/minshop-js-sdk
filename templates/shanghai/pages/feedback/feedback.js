import Config from '../../utils/config';
import Constants from '../../utils/constants';
import Utils from '../../utils/utils';

const App = getApp();

Page({
  data: {
    userFeedbackType: '',
    telephone_number: '',
    feedbackTypes: [{
      code: 'product_related',
      str: '商品相关'
    }, {
      code: 'logistics_status',
      str: '物流状况'
    }, {
      code: 'customer_service',
      str: '客户服务'
    }, {
      code: 'promotions',
      str: '优惠活动'
    }, {
      code: 'product_experience',
      str: '功能异常'
    }, {
      code: 'others',
      str: '其他'
    }],
    feedbackContentsLength: 0,
    showLoading: false,
    toastModalStatus: false,
    feedbackImages: [],
    wxExt: Config.WX_EXT,
  },

  onLoad: function (options) {
    App.gaScreenView('意见反馈');
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
      this.setData({
        showModalStatus: true
      });
    }

    setTimeout(function () {
      animation.translateY(0).step()

      this.setData({
        animationData: animation
      })

      if (e.currentTarget.dataset.status == 0) {
        this.setData({
          showModalStatus: false
        });
      }
    }.bind(this), 200)
  },

  // 选择反馈类型
  selectFeedbackType(e) {
    const index = e.currentTarget.dataset.index;
    const userFeedbackType = this.data.feedbackTypes[index];

    this.setData({
      userFeedbackType: userFeedbackType.str,
      category: userFeedbackType.code,
      userFeedbackIndex: index
    })

    this.setModalStatus(e);
  },

  // 输入反馈意见
  enterFeedbackContents(e) {
    const feedbackContents = e.detail.value;
    const feedbackContentsLength = feedbackContents.length;

    this.setData({
      content: feedbackContents,
      feedbackContentsLength
    })
  },

  //输入手机号
  inputPhoneNum(e) {
    const telephoneNumber = e.detail.value;

    this.setData({
      telephoneNumber
    })
  },

  // 上传图片
  uploadImage(e) {
    const sessionkey = App.storage.get(Constants.STORAGE_KEY.SESSION_KEY);
    let feedbackImages = this.data.feedbackImages || [];
    let replaceIndex = e.currentTarget.dataset.index;
    let that = this;

    wx.chooseImage({
      success: function (res) {
        const tempFilePaths = res.tempFilePaths;

        that.setData({
          showLoading: true
        })

        wx.uploadFile({
          url: Config.API_HOST + Config.API.UPLOAD_IMG_URL + '?sessionkey=' + sessionkey,
          header: Utils.processHeader(),
          filePath: tempFilePaths[0],
          name: 'image',
          success: function (res) {
            const data = JSON.parse(res.data);

            if (replaceIndex != undefined) {
              feedbackImages.splice(replaceIndex, 1, data.path);
            } else {
              feedbackImages.push(data.path);
            }

            that.setData({
              feedbackImages,
              showLoading: false
            })
          },
          fail: function (err) {
            wx.showModal({
              title: '网络似乎出了问题',
              content: '请稍后重试',
              success: function () {
                that.setData({
                  showLoading: false
                })
              }
            });
          }
        })
      }
    })
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

  // 提交反馈
  submitFeedback() {
    const category = this.data.category;
    const telephoneNumber = this.data.telephoneNumber;
    const content = this.data.content;
    const attachments = this.data.feedbackImages;

    if (category == undefined) {
      return this.showToast('请选择反馈类型！', 1000);
    }

    if (!content) {
      return this.showToast('请填写建议！', 1000);
    }

    if (!(/^1[34578]\d{9}$/.test(telephoneNumber))) {
      return this.showToast('请填写正确的手机号码！', 1000);
    }

    App.request({
      url: Config.API.FEEDBACK,
      data: {
        category,
        content,
        telephone_number: telephoneNumber,
        attachments
      },
      method: 'POST',
    }).then(res => {
      this.showToast('感谢您的建议！', 100);

      setTimeout(function () {
        wx.reLaunch({
          url: Config.ROUTE.USER_CENTER,
        })
      }, 1000)

    }).catch(err => {
      wx.showModal({
        title: '网络似乎出了问题',
        content: '请稍后重试'
      });
    });
  }
})
