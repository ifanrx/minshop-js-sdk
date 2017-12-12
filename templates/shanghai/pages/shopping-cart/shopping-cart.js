import Config from '../../utils/config';
import CONSTANTS from '../../utils/constants';
import Utils from '../../utils/utils';
import { couponSdk } from '../../utils/index';

import { ProductAction } from '../../utils/ga.js';

const App = getApp();
let timeoutId;

Page({
  data: {
    shoppingCart: {},
    productList: [],
    productCoupon: [],

    shoppingCartId: 0,
    totalPrice: 0,

    isEmptyShoppingCart: false,
    isOverInventory: false,
    isSelectedAll: false,
    isShowPreferentialModal: false
  },

  onLoad(options) {
    App.gaScreenView('购物车');
  },

  onShow() {
    Promise.all([this.getProductCoupon(), this.getShoppingCart()]).then((res) => {
      this.filterGroup()
      Utils.hideLoadingToast(timeoutId);
    })
    this.isgettingCoupon = false;
  },

  saveProductCounts(product) {
    const { quantity, product_sku_id } = product;
    const shoppingCartId = this.data.shoppingCart.id;

    const data = {
      shoppingCartId,
      product_sku_id,
      quantity
    };

    App.request({
      url: Config.API.SHOPPING_CART_OPERATION,
      method: 'PUT',
      data
    }).then(res => {

    }).catch(err => {

    });
  },

  refreshData() {
    timeoutId = Utils.showLoadingToast('加载中...');
    this.getProductCoupon().then(() => {
      this.filterGroup();
      this.isSelectAllGroup();
      Utils.hideLoadingToast(timeoutId);
    })
  },

  onHide() {
    const productList = this.data.productList;

    productList.forEach(item => {
      item.checked = false;
    });

    this.setData({
      productList,
      isSelectedAll: false,
      isOverInventory: false
    });
  },

  filterGroup() {
    const productCoupon = this.data.productCoupon;
    const productList = this.data.productList;

    let filterGroup = couponSdk.gen(productCoupon, productList);
    filterGroup.forEach(item => {
      if (item.next) {
        item.remain = Utils.toCent(item.next.minimum_amount - item.amount) / 100;
      }
    })

    this.setData({
      filterGroup
    })
  },

  /**
   * 获取购物车数据，并默认全选所有商品
   */
  getShoppingCart() {
    timeoutId = Utils.showLoadingToast('加载中...');

    return App.getShoppingCart(this).then(res => {
      const shoppingCartId = res.id || 0;
      const products = res.products || [];

      let isEmptyShoppingCart = false;

      if (products.length) {
        this.setSpec(products);
        this.setPermitNum(products);
      } else {
        isEmptyShoppingCart = true;
      }

      this.setData({
        shoppingCartId,
        isEmptyShoppingCart
      });

      return products
    }).catch(err => {
      Utils.hideLoadingToast(timeoutId, {
        title: '网络似乎出了问题',
        content: '点击确定自动刷新',

        success: res => {
          if (res.confirm) {
            this.getShoppingCart();
          }
        }
      });
    });
  },

  /**
   * 获取商品优惠券信息
   * @param {Number} id 商品 id
   */
  getProductCoupon() {
    const url = Config.API.SHOPPING_CART_COUPON;

    return App.request({
      url
    }).then(res => {
      let productCoupon = res.data;

      this.setData({
        productCoupon
      })

      return productCoupon
    })
  },

  /**
   * 点击叉号删除购物车商品
   */
  deleteProduct(e) {
    const product = e.currentTarget.dataset.product;
    const productId = product.product_id;
    const productSkuId = product.product_sku_id;
    const productList = this.data.productList;
    let index;

    productList.forEach((item, i) => {
      if (item.product_id == productId && item.product_sku_id == productSkuId) {
        index = i
      }
    })

    this.deleteProductHandle(index);
  },

  /**
   * 从购物车中删除商品
   * @param  {Number} index 将要删除的商品索引序号
   */
  deleteProductHandle(index) {
    const productList = this.data.productList;
    const product = productList[index];

    App.request({
      url: Config.API.SHOPPING_CART_OPERATION,
      method: 'PUT',
      data: {
        shoppingCartId: this.data.shoppingCartId,
        product_sku_id: product.product_sku_id,
        quantity: 0
      }
    }).then(res => {
      productList.splice(index, 1);

      const totalPrice = this.getTotalPrice(productList);

      if (!productList.length) {
        this.setData({
          isEmptyShoppingCart: true
        });
      }

      this.setData({
        productList,
        totalPrice,
      });

      App.getShoppingCart(this);

      this.filterGroup()
      this.isSelectAllGroup()

      console.log('gaEcommerce => ' + ProductAction.ACTION_REMOVE);
      App.gaEcommerce({
        id: product.product_id,
        name: product.title,
        brand: product.vendor || '',
        price: product.price,
        quantity: product.quantity,
        variant: product.spec_str,
      }, ProductAction.ACTION_REMOVE, '移出购物车', 'click', product.title);
    }).catch(err => {
      wx.showModal({
        title: '网络似乎出了问题',
        content: '请重试～',
        showCancel: false
      });
    });
  },

  /**
   * 设置 sku 的 spec 需要显示的信息
   * @param {Array} productList  购物车商品列表
   */
  setSpec(productList) {
    if (!productList.length) {
      return;
    }

    for (let i = 0; i < productList.length; i++) {
      // 超过库存
      if (productList[i].quantity > productList[i].inventory) {
        productList[i].isOverInventory = true;
        productList[i].checked = false;

        this.setData({
          isOverInventory: true
        })
      }

      if (!productList[i].spec_str) {
        productList[i].spec = '';
        continue;
      }

      let specStr = '';
      const specs = productList[i].spec_str.split(',');

      for (let t = 0; t < specs.length; t++) {
        if (specStr) {
          specStr += ' / ' + specs[t].split(':')[1];
        } else {
          specStr += specs[t].split(':')[1];
        }
      }
      productList[i].spec = specStr;
    }

    const totalPrice = this.getTotalPrice(productList);

    this.setData({
      productList,
      totalPrice
    });
  },

  setPermitNum(productList) {
    if (!productList.length) {
      return
    }

    productList.forEach(product => {
      product.permitNum = Number(product.purchase_limit) - Number(product.purchase_number);
    })

    this.setData({
      productList
    })
  },

  // 验证限购数
  verifyPermitNum(index) {
    let result = true;
    const productList = this.data.productList;
    const product = productList[index];

    if (product.purchase_limit && product.quantity > product.permitNum) {
      let text = product.purchase_number > 0
        ? `${product.title}商品规格限购${product.purchase_limit}件，您已经购买过${product.purchase_number}件，您可以调整商品购买数量或者选择其他规格。`
        : `${product.title}限购${product.purchase_limit}件，您可以调整商品购买数量或者选择其他规格。`;

      wx.showModal({
        content: text,
        showCancel: false
      })
      result = false;
    }

    return result;
  },

  /**
   * 计算已选择商品的总价
   * @param  {Array} productList  购物车商品列表
   * @return {Number}             已选择商品的总价
   */
  getTotalPrice(productList) {
    let totalPrice = 0;

    productList.forEach(item => {
      if (item.checked) {
        totalPrice += Utils.toCent((item.unit_price * item.quantity)) / 100;
      }
    });

    return Utils.strip(totalPrice);
  },

  /**
   * 改变选中商品
   */
  selectedProcuctChange(e) {
    const product = e.currentTarget.dataset.product;
    const checked = product.checked;
    const productId = product.product_id;
    const productSkuId = product.product_sku_id;
    const productList = this.data.productList;
    let isSelectedAll;
    let index;

    productList.forEach((item, i) => {
      if (item.product_id == productId && item.product_sku_id == productSkuId) {
        index = i
      }
    })

    if (checked) {
      isSelectedAll = false;
      productList[index].checked = false;
    } else {
      if (!this.verifyPermitNum(index)) {
        return
      };

      productList[index].checked = true;

      isSelectedAll = productList.every(item => {
        return item.checked;
      });
    }

    const totalPrice = this.getTotalPrice(productList);

    this.setData({
      productList,
      totalPrice,
      isSelectedAll
    });

    this.filterGroup()
    this.isSelectAllGroup()
  },

  // 全选分组
  toggleCheckAllGroup(e) {
    const index = e.currentTarget.dataset.index;
    let filterGroup = this.data.filterGroup;
    let productList = this.data.productList;
    let group = filterGroup[index];
    let checked = group.checked;
    let isSelectedAll;
    let inStock;

    let isOverPermitNum = false;

    if (!checked) {
      group.sku.forEach((item, i) => {
        if (!this.verifyPermitNum(i)) {
          isOverPermitNum = true;
        }
        return
      })

      if (isOverPermitNum){
        return
      }

      inStock = group.sku.every(item => {
        return item.product_status == 'in_stock'
      })

      if (this.data.isOverInventory || !inStock) {
        isSelectedAll = false;
        this.showErrorModal('有商品存货不足');
        return;
      }
    }

    filterGroup[index].checked = !checked;

    productList.forEach(item => {
      group.sku.forEach(sku => {
        if (sku.product_id == item.product_id && sku.product_sku_id == item.product_sku_id) {
          item.checked = !checked;
        }
      })
    })

    if (checked) {
      isSelectedAll = false;
    } else {
      isSelectedAll = productList.every(item => {
        return item.checked
      })
    }

    const totalPrice = this.getTotalPrice(productList);

    this.setData({
      filterGroup,
      productList,
      isSelectedAll,
      totalPrice
    })

    this.filterGroup()
    this.isSelectAllGroup()
  },

  /**
   * 根据 operation 参数判断是加还是减
   * 减操作到数量为 1 时，继续按减则取消选中该商品
   * 加操作需要判断是否超过库存
   */
  changeQuantity(e) {
    const productList = this.data.productList;
    const product = e.currentTarget.dataset.product;
    const productId = product.product_id;
    const productSkuId = product.product_sku_id;
    const operation = e.currentTarget.dataset.operation;

    let index;

    productList.forEach((item, i) => {
      if (item.product_id == productId && item.product_sku_id == productSkuId) {
        index = i
      }
    })

    if (operation === 'minus') {
      if (productList[index].quantity > 1) {
        productList[index].quantity -= 1;
      } else if (productList[index].quantity == 1) {
        productList[index].checked = false;
      }

      // 判断 全选按钮 是否要设置为可点击
      if (productList[index].isOverInventory && productList[index].quantity <= productList[index].inventory && productList[index].product_status == 'in_stock') {
        let isOverInventory = false;
        productList[index].isOverInventory = false;
        productList[index].checked = true;

        // 如果还存在其他商品超出库存，则 isOverInventory 仍为 true
        productList.forEach(item => {
          if (item.isOverInventory || item.product_status != 'in_stock') {
            isOverInventory = true;
          }
        });

        this.setData({
          isOverInventory
        })
      }
    } else if (operation === 'add') {

      if (this.verifyPermitNum(index) == false) {
        return
      }

      productList[index].quantity += 1;
      productList[index].checked = true;

      // 超过库存
      if (productList[index].quantity > productList[index].inventory || productList[index].product_status != 'in_stock') {
        const isOverInventory = true;
        productList[index].isOverInventory = true;
        productList[index].checked = false;

        this.setData({
          isOverInventory
        });
      }
    }

    productList[index].checked = this.verifyPermitNum(index);

    const totalPrice = this.getTotalPrice(productList);

    // 所有商品都为选中状态时，则为全选状态
    const isSelectedAll = productList.every(item => {
      return item.checked;
    });

    this.setData({
      productList,
      totalPrice,
      isSelectedAll
    });
    this.saveProductCounts(productList[index]);

    this.filterGroup()
    this.isSelectAllGroup()
  },

  isSelectAllGroup() {
    let filterGroup = this.data.filterGroup;

    filterGroup.forEach(item => {
      item.checked = item.sku.every(product => {
        return product.checked
      })
      return item
    })

    this.setData({
      filterGroup
    })
  },

  /**
   * 设置全选或取消全选
   */
  selectAll(e) {
    const productList = this.data.productList;
    let isSelectedAll = true;
    let inStock;
    let isOverPermitNum = false;

    if (!this.data.isSelectedAll) {
      productList.forEach((item, i)=> {
        if (!this.verifyPermitNum(i)){
          isOverPermitNum = true;
          return
        }
      })

      if (isOverPermitNum) {
        return
      }

      inStock = productList.every(item => {
        return item.product_status == 'in_stock'
      })

      if (this.data.isOverInventory || !inStock) {
        isSelectedAll = false;
        this.showErrorModal('有商品存货不足');
        return;
      }
    } else {
      isSelectedAll = false;
    }

    // 设置每个商品的选中状态与全选按钮状态一致
    productList.forEach(item => {
      item.checked = isSelectedAll;
    });

    const totalPrice = this.getTotalPrice(productList);

    this.setData({
      productList,
      totalPrice,
      isSelectedAll
    });

    this.filterGroup()
    this.isSelectAllGroup()
  },

  /**
   * 把需要付款的商品信息存入 LocalStorage，然后跳转到结算页取出数据，进行结算
   */
  payment() {
    // if (this.isgettingCoupon) {
    //   return;
    // }

    let rs = true;

    let productList = this.data.productList;
    productList.forEach((item, i) => {
      if (item.checked && !this.verifyPermitNum(i)){
        rs = this.verifyPermitNum(i)
        return
      }
    })

    if(!rs) {
      return
    }

    // this.isgettingCoupon = true;

    if (this.data.totalPrice > 0) {
      const skuToPay = [];
      const productList = this.data.productList;

      productList.forEach(item => {
        if (item.checked) {
          skuToPay.push(item);
        }
      });

      App.storage.set(CONSTANTS.STORAGE_KEY.SKU_TO_PAY, skuToPay);

      const skuIds = [];
      const quantities = [];

      skuToPay.forEach(item => {
        skuIds.push(item.product_sku_id);
        quantities.push(item.quantity);
      });

      // const orderBy = '-face_value,valid_until';
      // App.getAvailableCoupon(skuIds, quantities, orderBy, this).then(res => {
      //   App.storage.set(CONSTANTS.STORAGE_KEY.AVAILABLE_COUPON_LIST, res);

      //   console.log('gaEcommerce => ' + ProductAction.ACTION_CHECKOUT);
      //   const gaProductList = skuToPay.map(item => {
      //     return {
      //       id: item.product_id,
      //       name: item.title,
      //       brand: item.vendor || '',
      //       price: item.price,
      //       quantity: item.quantity,
      //       variant: item.spec_str,
      //     }
      //   });
      //   App.gaEcommerceCheckout(gaProductList, 1, '购物车结算', 'click');

        wx.navigateTo({
          url: Config.ROUTE.PAY + '?shoppingCartId=' + this.data.shoppingCartId
        });
      // }).catch(err => {

      // }).finally(res => {
      //   this.isgettingCoupon = false;
      // });
    } else {
      this.showErrorModal('请选择需要结算的商品');
    }
  },

  /**
   * 选中商品或点击全选按钮时触发
   */
  showErrorMessage(e) {
    const product = e.currentTarget.dataset.product;
    let message = '存货不足，您可以调整购买数量或先结算其它商品';
    if (product) {
      message = product.title + ' ' + message
    } else {
      message = '购物车内有商品库存不足，请调整购买数量';
    }

    this.showErrorModal(message);
  },

  /**
   * 错误提示弹框
   * @param  {[type]} errorMsg [description]
   * @return {[type]}          [description]
   */
  showErrorModal(errorMsg) {
    wx.showModal({
      title: '提示',
      content: errorMsg,
      showCancel: false
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
    const group = e.currentTarget.dataset.group;
    const productCoupon = this.data.productCoupon;

    let currentCoupon = couponSdk.getRedeemableCoupon(group, productCoupon);
    currentCoupon = Utils.formatCouponListValidTime(currentCoupon);

    this.setData({
      isShowPreferentialModal: true,
      currentPreferentialIndex: index,
      currentCoupon
    })
  },

  // 关闭活动弹出层
  closePreferentialModal() {
    this.refreshData();

    this.setData({
      isShowPreferentialModal: false
    })
  },

  // 点击领取优惠券
  getCoupon(e) {
    let currentCoupon = this.data.currentCoupon;
    let { item, index } = e.currentTarget.dataset;
    let id = item.sequence;

    App.request({
      url: Config.API.OFFER,
      data: {
        sequenceId: id
      }
    }).then(res => {
      const errMeg = res.data.status;
      currentCoupon[index].errMeg = errMeg;

      this.setData({
        currentCoupon
      })
    }, err => {
      const errMeg = err.data;
      currentCoupon[index].errMeg = errMeg;

      this.setData({
        currentCoupon
      })
    });
  },

  navToShelf(e) {
    const shelf = e.currentTarget.dataset.shelf;
    console.log(shelf);
    if (shelf.shelf_id == 0) {
      if (shelf.product_id.length) {
        wx.navigateTo({
          url: Config.ROUTE.DETAIL + '?id=' + shelf.product_id[0]
        })
        return
      } else {
        wx.navigateTo({
          url: Config.ROUTE.LIST + '?id=33'
        })
        return
      }
    } else {
      if (shelf.shelf_type) {
        switch (shelf.shelf_type) {
          case 'activity':
            wx.navigateTo({
              url: Config.ROUTE.ACTIVITY + '?id=' + shelf.shelf_id
            });
            break;
          case 'vendor':
            wx.navigateTo({
              url: Config.ROUTE.BRAND + '?id=' + shelf.shelf_id
            });
            break;
          default:
            wx.navigateTo({
              url: Config.ROUTE.LIST + '?id=33'
            })
        }
      }
    }
  },

  enterDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: Config.ROUTE.DETAIL + '?id=' + id
    });
  },

  /**
   * 跳转到首页
   */
  navToHome() {
    App.navToHome();
  }
});
