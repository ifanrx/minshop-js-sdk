var utils = require('./utils')

function genCandidateMap(productcoupon, sku, coupon) {
  var result = {}
  var now = utils.now()

  var productMap = sku
  var couponMap = coupon

  // 优化点，如果已经转换过就不需要再处理
  if (Object.prototype.toString.call(sku) === '[object Array]') {
    productMap = genProductMap(productMap)
  }

  if (Object.prototype.toString.call(sku) === '[object Array]') {
    couponMap = genCouponMap(couponMap)
  }

  // 排除未开始的、过期的
  var productcouponAvailable = productcoupon.filter(item => {
    return item.valid_from < now &&
      item.valid_until > now
  })

  // 计算符合门槛的
  for (var i = 0; i < productcouponAvailable.length; i++) {
    var currentProductcoupon = productcouponAvailable[i]
    var total = 0
    var productId = []
    var usableProductId = currentProductcoupon.product_id

    if (currentProductcoupon.coupon_type === 'general') {
      usableProductId = Object.keys(productMap).map(id => parseInt(id, 10))
    }

    for (var j = 0; j < usableProductId.length; j++) {
      if (productMap[usableProductId[j]]) {
        productId.push(usableProductId[j])
        total += productMap[usableProductId[j]]
      }
    }

    if (productId.length > 0 && total >= utils.toCent(currentProductcoupon.minimum_amount)) {
      productId = productId.sort()
      var key = productId.join(',')
      var existed = result[key] || {face_value: 0}
      if (existed.face_value < currentProductcoupon.face_value) {
        result[key] = {
          face_value: currentProductcoupon.face_value,
          product_id: productId,
          sequence: currentProductcoupon.sequence,
          shelf_id: currentProductcoupon.shelf_id,
          shelf_type: currentProductcoupon.shelf_type,
          coupon_type: currentProductcoupon.coupon_type,
          description: currentProductcoupon.description,
        }
      }
    }
  }

  return result
}

function genCouponMap(coupon) {
  var map = {}
  for (var i = 0; i < coupon.length; i++) {
    var current = coupon[i]
    if (current.status === 'used') {
      map[current.sequence] = map[current.sequence] || 0
      map[current.sequence] += 1
    }
  }
  return map
}

// 有效的商品小计
function genProductMap(sku) {
  var productMap = {} // 各商品总额
  for (var i = 0; i < sku.length; i++) {
    var currentSku = sku[i]
    if (currentSku.quantity > 0) {
      let skuQty = currentSku.quantity
      if (currentSku.inventory < skuQty) {
        skuQty = currentSku.inventory
      }

      if (productMap[currentSku.product_id]) {
        productMap[currentSku.product_id] = productMap[currentSku.product_id] + skuQty * utils.toCent(currentSku.unit_price)
      } else {
        productMap[currentSku.product_id] = skuQty * utils.toCent(currentSku.unit_price)
      }
    }
  }
  return productMap
}

module.exports = {
  genCandidateMap,
  genCouponMap,
  genProductMap,
}
