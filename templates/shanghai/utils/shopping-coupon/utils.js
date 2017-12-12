function now() {
  return Math.floor(new Date().getTime() / 1000)
}

function isDup(a, b) {
  var obj = {}
  for (var i = 0; i < a.length; i++) {
    for (var j = 0; j < b[a[i]].length; j++) {
      var id = b[a[i]][j]
      if (obj[id] && obj[id] > 0) {
        obj[id] += 1
        return true
      } else {
        obj[id] = 1
      }
    }
  }
  return false
}

function toIndexArray(option) {
  var arr = []
  for (var i = 0; i < option.length; i++) {
    option[i] && arr.push(i)
  }
  return arr
}

function knapsack(a, b, limitW) {
  var totV = 0
  var maxV = 0
  var option = []
  var cop = []

  var N = a.length

  for (var i = 0; i < a.length; i++) {
    totV += a[i].value
  }

  function find(i, tw, tv) {
    var k
    if (tw + a[i].weight <= limitW) // 考虑物品i放入背包的情况
    {
      cop[i] = true
      if (i < N - 1) {
        find(i + 1, tw + a[i].weight, tv)
      } else {
        // 最佳结果形成
        for (k = 0; k < N; k++) {
          option[k] = cop[k]
        }
        maxV = tv
      }

      if (isDup(toIndexArray(option), b)) {
        cop[i] = false
        if (i < N - 1) {
          find(i + 1, tw, tv - a[i].value)
        } else {
          // 最佳结果形成
          for (k = 0; k < N; k++) {
            option[k] = cop[k]
          }
          maxV = tv - a[i].value
        }
      }
    }
    if (tv - a[i].value > maxV) // 考虑物品i不放入背包的情况，此状态可以剪掉部分节点
    {
      cop[i] = false
      if (i < N - 1) {
        find(i + 1, tw, tv - a[i].value)
      } else {
        // 最佳结果形成
        for (k = 0; k < N; k++) {
          option[k] = cop[k]
        }
        maxV = tv - a[i].value
      }
    }
  }

  find(0, 0, totV)

  return toIndexArray(option).sort()
}

function greed(a, b, limitW) {
  var result = []

  for (var i = 0; i < a.length; i++) {
    a[i].status = 0 // 标识为未遍历过
  }

  while (true) {
    var s = strategy(a, limitW)
    if (s == -1) break

    result.push(s)
    limitW = limitW - a[s].weight
    a[s].status = 1

    if (isDup(result, b)) {
      result.pop()
      limitW = limitW + a[s].weight
      a[s].status = -1
    }
  }

  return result.sort()
}

function find(arr, pred) {
  for (var i = 0; i < arr.length; i++) {
    if (pred(arr[i])) {
      return arr[i]
    }
  }
}

// 组合数最多优先
function strategy(a, limitW) {
  var index = -1
  var temp = find(a, good => good.status === 0)
  temp = temp && temp.weight
  if (temp) {
    for (var i = 0; i < a.length; i++) {
      var currentGood = a[i]
      if (currentGood.status == 0 && currentGood.weight <= limitW && currentGood.weight >= temp) {
        index = i
        temp = a[index].weight
      }
    }
  }
  return index
}

function toAlgParams(candidateMap) {
  var result = {
    a: [],
    b: [],
  }

  for (var key in candidateMap) {
    result.a.push({
      weight: candidateMap[key].product_id.length,
      value: candidateMap[key].face_value,
    })
    result.b.push(candidateMap[key].product_id)
  }

  return result
}

// 转换成优惠券形式，并且按最大优惠优先顺序返回
function toCouponList(candidateMap, keys, indexArray) {
  var result = []
  for (var i = 0; i < indexArray.length; i++) {
    result.push(candidateMap[keys[indexArray[i]].join(',')])
  }
  return result.sort(sortByFaceValue)
}

function sortByFaceValue(a, b) {
  if (a.face_value > b.face_value) return -1
  if (a.face_value < b.face_value) return 1
  return 0
}

// 判断 a includes b
function includes(a, b) {
  for (var i = 0; i < b.length; i++) {
    if (a.indexOf(b[i]) === -1) return false
  }
  return true
}

function toCent(price) {
  let str = String(price).split('.')
  let result = str[0]
  if (str.length > 1) {
    let part2 = str[1].slice(0, 2)
    if (part2.length === 1) {
      part2 += '0'
    }
    result += part2
  } else {
    result += '00'
  }
  return parseInt(result, 10)
}

module.exports = {
  greed,
  includes,
  isDup,
  knapsack,
  now,
  sortByFaceValue,
  toAlgParams,
  toCouponList,
  toCent,
}
