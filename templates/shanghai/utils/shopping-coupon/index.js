var utils = require('./utils')
var candidate = require('./candidate')

function wrap(productcoupon, sku, coupon, reached) {
  var result = []
  var i
  var now = utils.now()

  // 按价值高到底排序的全场券
  var generalProductcoupon = []
  for (i = 0; i < productcoupon.length; i++) {
    if (productcoupon[i].coupon_type === 'general') {
      generalProductcoupon.push(productcoupon[i])
    }
  }
  generalProductcoupon.sort((a, b) => {
    if (a.face_value > b.face_value) return -1
    if (a.face_value < b.face_value) return 1
    return 0
  })

  var productMap = candidate.genProductMap(sku)
  var couponMap = candidate.genCouponMap(coupon)
  var keys = Object.keys(productMap)
  var productId = []
  for (i = 0; i < keys.length; i++) {
    productId.push(parseInt(keys[i], 10))
  }
  productId = productId.sort()
  var limitW = productId.length // 参与计算的有效商品

  var candidateMap = candidate.genCandidateMap(productcoupon, productMap, couponMap)

  var indexArray = []
  var params

  if (limitW >= reached) {
    // 排除全场券
    for (var key in candidateMap) {
      if (candidateMap[key].coupon_type === 'general') {
        delete candidateMap[key]
      }
    }

    params = utils.toAlgParams(candidateMap)
    if (params.a.length > 0) {
      indexArray = utils.greed(params.a, params.b, limitW)
    }
  } else {
    params = utils.toAlgParams(candidateMap)
    if (params.a.length > 0) {
      indexArray = utils.knapsack(params.a, params.b, limitW)
    }
  }

  var parts = utils.toCouponList(candidateMap, params.b, indexArray)

  var usedProductId = []
  for (i = 0; i < parts.length; i++) {
    result.push(parts[i])
    usedProductId = usedProductId.concat(parts[i].product_id)
  }

  // 在所有全场券中找最符合的
  if (generalProductcoupon.length > 0) {
    var leftProductId = []
    var total = 0
    for (i = 0; i < productId.length; i++) {
      if (usedProductId.indexOf(productId[i]) === -1) { // 未分配的
        leftProductId.push(productId[i])
        total += productMap[productId[i]]
      }
    }

    if (leftProductId.length > 0) {
      for (i = 0; i < generalProductcoupon.length; i++) {
        if (generalProductcoupon[i].valid_from < now &&
          generalProductcoupon[i].valid_until > now &&
          total >= utils.toCent(generalProductcoupon[i].minimum_amount)) {
          result.push({
            face_value: generalProductcoupon[i].face_value,
            product_id: leftProductId.sort(),
            sequence: generalProductcoupon[i].sequence,
            shelf_id: generalProductcoupon[i].shelf_id,
            shelf_type: generalProductcoupon[i].shelf_type,
            coupon_type: generalProductcoupon[i].coupon_type,
            description: generalProductcoupon[i].description,
          })
          break
        }
      }
    }
  }
  return result.sort(utils.sortByFaceValue)
}

// 按最低门槛分组
function wrapByMinimumAmount(skuList, availableCouponList, reached) {
  var i
  var productAmoutMap = skuList.reduce((map, sku) => {
    let qty = sku.quantity
    if (qty > sku.inventory) qty = sku.inventory
    let total = map[sku.product_id] || 0
    total += utils.toCent(sku.unit_price) * qty
    map[sku.product_id] = total
    return map
  }, {})
  // 门槛小到大排序
  availableCouponList = availableCouponList.sort((a, b) => {
    if (a.minimum_amount > b.minimum_amount) {
      return 1
    } else if (a.minimum_amount < b.minimum_amount) {
      return -1
    } else {
      return 0
    }
  })

  var availableCouponLookup = availableCouponList.reduce((map, coupon) => {
    map[coupon.sequence] = coupon
    return map
  }, {})

  var couponList = availableCouponList.map((coupon, i) =>
    Object.assign({}, coupon, {
      face_value: availableCouponList.length - i,
      minimum_amount: 0,
    })
  )

  var candidateMap = candidate.genCandidateMap(couponList, productAmoutMap, [])

  var keys = Object.keys(productAmoutMap)

  var productId = []
  for (i = 0; i < keys.length; i++) {
    productId.push(parseInt(keys[i], 10))
  }
  productId = productId.sort()
  var limitW = productId.length // 参与计算的有效商品

  var indexArray = []
  var params
  var result = []

  if (limitW >= reached) {
    params = utils.toAlgParams(candidateMap)
    if (params.a.length > 0) {
      indexArray = utils.greed(params.a, params.b, limitW)
    }
  } else {
    params = utils.toAlgParams(candidateMap)
    if (params.a.length > 0) {
      indexArray = utils.knapsack(params.a, params.b, limitW)
    }
  }

  var parts = utils.toCouponList(candidateMap, params.b, indexArray)

  result.sort(utils.sortByFaceValue)

  for (i = 0; i < parts.length; i++) {
    result.push(parts[i])
  }

  // 转换成原来的格式
  return result.map(item => {
    var coupon = availableCouponLookup[item.sequence]
    return ({
      face_value: coupon.face_value,
      product_id: item.product_id,
      sequence: coupon.sequence,
      shelf_id: coupon.shelf_id,
      shelf_type: coupon.shelf_type,
      coupon_type: coupon.coupon_type,
      description: coupon.description,
    })
  })
}

/**
 * 生成按优惠券分组的商品列表
 * @param  {数组} productcoupon 商品相关的所有优惠券
 * @param  {数组} sku           商品
 * @return {数组}               分组商品
 */
function gen(productcoupon, sku, reached = 50) {
  var result = []
  var productMap = candidate.genProductMap(sku)
  var i
  var j
  var now = utils.now()

  // 排除过期的优惠券 - 防止后端返回过期的
  productcoupon = productcoupon.filter(c => now > c.valid_from && now < c.valid_until)

  // 适配
  for (i = 0; i < productcoupon.length; i++) {
    productcoupon[i].coupon_type = null
    if (productcoupon[i].shelf_id === 0 && productcoupon[i].product_id.length === 0) {
      productcoupon[i].coupon_type = 'general'
    }
  }

  // 重置标识
  sku = sku.map(x => {
    x.allocated = false
    return x
  })

  var group = wrap(productcoupon, sku, [], reached)

  var usedSequence = []
  var usedSequenceNext = [] // 已分配的下一张优惠券列表
  for (i = 0; i < group.length; i++) {
    usedSequence.push(group[i].sequence)
  }

  var skuLookup = {}
  for (i = 0; i < sku.length; i++) {
    skuLookup[sku[i].product_id] = skuLookup[sku[i].product_id] || {}
    skuLookup[sku[i].product_id][sku[i].product_sku_id] = sku[i]
  }

  var productcouponLookup = {}
  var productcouponHasNext = [] // 下一次可分配的优惠券
  var productcouponWithGeneral = [] // 全场券的
  for (i = 0; i < productcoupon.length; i++) {
    productcouponLookup[productcoupon[i].sequence] = productcouponLookup[productcoupon[i].sequence] || {}
    productcouponLookup[productcoupon[i].sequence] = productcoupon[i]

    if (productcoupon[i].product_id.length > 0 && usedSequence.indexOf(productcoupon[i].sequence) === -1) {
      if (productcoupon[i].valid_from < now && productcoupon[i].valid_until > now) {
        productcouponHasNext.push(productcoupon[i])
      }
    }

    if (productcoupon[i].coupon_type === 'general' && usedSequence.indexOf(productcoupon[i].sequence) === -1) {
      if (productcoupon[i].valid_from < now && productcoupon[i].valid_until > now) {
        productcouponWithGeneral.push(productcoupon[i])
      }
    }
  }

  productcouponHasNext = productcouponHasNext.sort((a, b) => {
    if (a.minimum_amount > b.minimum_amount) return 1
    if (a.minimum_amount < b.minimum_amount) return -1
    return 0
  })

  productcouponWithGeneral = productcouponWithGeneral.sort((a, b) => {
    if (a.minimum_amount > b.minimum_amount) return 1
    if (a.minimum_amount < b.minimum_amount) return -1
    return 0
  })

  // 按优惠券组装数据
  for (i = 0; i < group.length; i++) {
    var item = group[i]

    var sq = productcouponLookup[item.sequence]
    var skucoupon = {
      current: {
        description: sq.description,
        face_value: sq.face_value,
        minimum_amount: sq.minimum_amount,
        product_id: item.coupon_type === 'general' ? [] : item.product_id,
        redeemed: sq.redeemed,
        sequence: sq.sequence,
        shelf_id: sq.shelf_id,
        shelf_type: sq.shelf_type,
      },
      next: null,
      sku: [],
      amount: 0,
    }

    for (j = 0; j < item.product_id.length; j++) {
      var pid = item.product_id[j]
      var p = skuLookup[pid]
      for (var key in p) {
        if (p[key].quantity > 0) {
          skucoupon.sku.push(Object.assign({}, p[key]))
          p[key].allocated = true
        }
      }

      skucoupon.amount += productMap[pid]
    }

    skucoupon.amount = skucoupon.amount / 100

    var pcoupon
    // 专场、单品券
    for (j = 0; j < productcouponHasNext.length; j++) {
      pcoupon = productcouponHasNext[j]
      if (utils.includes(pcoupon.product_id, item.product_id) &&
        utils.toCent(pcoupon.face_value) > utils.toCent(sq.face_value) &&
        usedSequenceNext.indexOf(pcoupon.sequence) === -1) {
        skucoupon.next = {
          description: pcoupon.description,
          face_value: pcoupon.face_value,
          minimum_amount: pcoupon.minimum_amount,
          product_id: item.coupon_type === 'general' ? [] : item.product_id,
          redeemed: sq.redeemed,
          sequence: pcoupon.sequence,
          shelf_id: pcoupon.shelf_id,
          shelf_type: sq.shelf_type,
        }
        usedSequenceNext.push(pcoupon.sequence)
        break
      }
    }

    // 全场券
    if (item.coupon_type === 'general') {
      for (j = 0; j < productcouponWithGeneral.length; j++) {
        pcoupon = productcouponWithGeneral[j]
        if (utils.toCent(pcoupon.face_value) > utils.toCent(sq.face_value) &&
          usedSequenceNext.indexOf(pcoupon.sequence) === -1) {
          skucoupon.next = {
            description: pcoupon.description,
            face_value: pcoupon.face_value,
            minimum_amount: pcoupon.minimum_amount,
            product_id: [],
            redeemed: sq.redeemed,
            sequence: pcoupon.sequence,
            shelf_id: pcoupon.shelf_id,
            shelf_type: sq.shelf_type,
          }
          usedSequenceNext.push(pcoupon.sequence)
          break
        }
      }
    }

    result.push(skucoupon)
  }

  // 没有分配的 SKU 放到一个分组
  var other = []
  for (var x in skuLookup) {
    for (var y in skuLookup[x]) {
      var currentSku = skuLookup[x][y]
      if (!currentSku.allocated) {
        other.push(currentSku)
      }
    }
  }

  // 在没有分配的 SKU 中再计算一次
  // 按最低门槛优先分组计算下一张优惠券
  var leftCoupon = productcoupon.filter(c => usedSequenceNext.indexOf(c.sequence) === -1 &&
    usedSequence.indexOf(c.sequence) === -1 &&
    c.valid_from < now &&
    c.valid_until > now)

  var leftGroup = wrapByMinimumAmount(other, leftCoupon)

  // 按优惠券组装数据
  for (i = 0; i < leftGroup.length; i++) {
    let item = leftGroup[i]

    let sq = productcouponLookup[item.sequence]
    let skucoupon = {
      current: null,
      next: {
        description: sq.description,
        face_value: sq.face_value,
        minimum_amount: sq.minimum_amount,
        product_id: item.coupon_type === 'general' ? [] : item.product_id,
        redeemed: sq.redeemed,
        sequence: sq.sequence,
        shelf_id: sq.shelf_id,
        shelf_type: sq.shelf_type,
      },
      sku: [],
      amount: 0,
    }

    for (j = 0; j < item.product_id.length; j++) {
      let pid = item.product_id[j]
      let p = skuLookup[pid]
      for (let key in p) {
        if (p[key].quantity > 0) {
          skucoupon.sku.push(Object.assign({}, p[key]))
          p[key].allocated = true
        }
      }

      skucoupon.amount += productMap[pid]
    }

    skucoupon.amount = skucoupon.amount / 100

    result.push(skucoupon)
  }

  let lelfOther = []
  for (let x in skuLookup) {
    for (let y in skuLookup[x]) {
      let currentSku = skuLookup[x][y]
      if (!currentSku.allocated) {
        lelfOther.push(currentSku)
      }
    }
  }

  if (lelfOther.length > 0) {
    result.push({
      current: null,
      next: null,
      sku: lelfOther,
      amount: 0,
    })
  }

  return result
}

function getRedeemableCoupon(group, productcoupon) {
  var now = utils.now()
  var productId = []
  var i

  for (i = 0; i < group.sku.length; i++) {
    if (productId.indexOf(group.sku[i].product_id) === -1) { productId.push(group.sku[i].product_id) }
  }

  var result = []

  // 排除未开始的、过期的、领过的
  var productcouponAvailable = productcoupon.filter(item => {
    return item.valid_from < now &&
      item.valid_until > now &&
      item.redeemed === false
  })

  for (i = 0; i < productcouponAvailable.length; i++) {
    // 全场券
    if (productcouponAvailable[i].shelf_id === 0 && productcouponAvailable[i].product_id.length === 0) {
      result.push(productcouponAvailable[i])
    } else if (isMatch(productcouponAvailable[i].product_id, productId)) {
      result.push(productcouponAvailable[i])
    }
  }

  return result.sort((a, b) => {
    if (a.face_value < b.face_value) return 1
    if (a.face_value > b.face_value) return -1
    return 0
  })
}

function isMatch(a, b) {
  for (var i = 0; i < a.length; i++) {
    for (var j = 0; j < b.length; j++) {
      if (a[i] === b[j]) return true
    }
  }
  return false
}

module.exports = {
  wrap,
  gen,
  getRedeemableCoupon,
}
