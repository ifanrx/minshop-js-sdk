import Config from '../../utils/config';
import Constants from '../../utils/constants'

const App = getApp()
Page({
  data: {
    sexMap: [
      '男',
      '女'
    ],
    sexCode: [
      'male',
      'female'
    ],
    userSex: '',
    date: '请选择'
  },

  onLoad: function (options) {
    this.getUserInfo()
    App.gaScreenView('我的信息');
  },

  getUserInfo() {

    return App.request({
      url: Config.API.USER_PROFILE,
      method: 'GET'
    }).then(res => {
      const userInfo = res.data;
      let userSex = '';

      if (userInfo.gender) {
        userSex = userInfo.gender === 'male' ? '男' : '女';
      }

      this.setData({
        userInfo,
        userSex
      })
    }).catch(err => {
      if (App.isAuthorized()) {
        wx.showModal({
          title: '网络似乎出了问题',
          content: '点击确定自动刷新',

          success: res => {
            if (res.confirm) {
              this.getUserInfo();
            }
          }
        });
      }
    });
  },

  chooseSex(e) {
    const sex = e.currentTarget.dataset.sex;
    let userSex = this.data.sexMap[sex];
    let gender = this.data.sexCode[sex];

    this.setData({
      userSex,
      gender
    })
  },

  modifyName(e) {
    const value = e.detail.value;
    let userInfo = this.data.userInfo;
    userInfo.nickname = value;

    this.setData({
      userInfo
    })
  },

  bindDateChange: function (e) {
    const value = e.detail.value;
    let userInfo = this.data.userInfo;
    userInfo.birthday = value;

    this.setData({
      date: value,
      userInfo
    })
  },

  // 上传图片
  uploadImage() {
    const sessionkey = App.storage.get(Constants.STORAGE_KEY.SESSION_KEY);
    let userInfo = this.data.userInfo;
    let that = this;

    wx.chooseImage({
      success: function (res) {
        let filePath = res.tempFilePaths[0];

        that.setData({
          showLoading: true
        })

        console.log(filePath);
        const url = Config.API_HOST + Config.API.USER_AVATAR + '?sessionkey=' + sessionkey;

        wx.uploadFile({
          url: url,
          filePath: filePath,
          name: 'avatar',
          header: Utils.processHeader(),
          success: function (res) {
            const data = JSON.parse(res.data);
            userInfo.avatar_link = data.avatar;

            that.setData({
              userInfo,
              showLoading: false
            })
          },
          fail: function (err) {
            console.log(err);
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

  // 修改头像
  modifyUserAvatar() {
    const { avatar_link } = this.data.userInfo;
    let formData = {};
    formData.avatar = avatar_link;

    return App.request({
      url: Config.API.USER_AVATAR,
      method: 'POST',
      data: formData
    }).then(res => {

    }).catch(err => {
      if (App.isAuthorized()) {
        wx.showModal({
          title: '网络似乎出了问题',
          content: '点击确定自动刷新'
        });
      }
    });
  },

  // 修改信息
  modifyUserInfo() {
    const gender = this.data.gender;
    const { resource_uri, user_id, birthday, nickname } = this.data.userInfo;
    const sessionkey = App.storage.get(Constants.STORAGE_KEY.SESSION_KEY);

    return App.request({
      url: resource_uri.replace('dserve', 'api') + '?sessionkey=' + sessionkey,
      data: {
        nickname,
        birthday,
        gender
      },
      method: 'PUT'
    }).then(res => {
      wx.showModal({
        title: '修改信息成功',
        showCancel: false,
        success: function () {
          wx.switchTab({
            url: Config.ROUTE.USER_CENTER,
          })
        }
      })
    }).catch(err => {
      if (App.isAuthorized()) {
        wx.showModal({
          title: '网络似乎出了问题',
          content: '点击确定自动刷新'
        });
      }
    });
  },

  // 保存用户信息
  saveUserInfo() {
    this.modifyUserInfo();
  }

})
