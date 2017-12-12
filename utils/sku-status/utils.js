function toObj(csv) {
  const obj = {}
  let pair = csv.split(',')
  for (let i = 0; i < pair.length; i++) {
    const keyvalue = pair[i].split(':')
    obj[keyvalue[0]] = keyvalue[1]
  }
  return obj
}

function toSkuObj(sku) {
  const obj = toObj(sku['spec_list'])
  obj.skuId = String(sku.id)
  return obj
}

function toSkuList(data) {
  return data.map(toSkuObj)
}

function powerset(arr) {
  const ps = [
    [],
  ]
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0, len = ps.length; j < len; j++) {
      ps.push(ps[j].concat(arr[i]))
    }
  }
  return ps
}

function trimSpliter(str, spliter) {
  var reLeft = new RegExp('^' + spliter + '+', 'g')
  var reRight = new RegExp(spliter + '+$', 'g')
  var reSpliter = new RegExp(spliter + '+', 'g')
  return str
    .replace(reLeft, '')
    .replace(reRight, '')
    .replace(reSpliter, spliter)
}

function getKeys(data) {
  const keys = []
  for (let attrKey in data[0]) {
    if (!data[0].hasOwnProperty(attrKey)) continue
    if (attrKey != 'skuId') keys.push(attrKey)
  }
  return keys
}

function combineAttr(data, keys, spliter) {
  const allKeys = []
  const result = {}

  for (let i = 0; i < data.length; i++) {
    let item = data[i]
    let values = []

    for (let j = 0; j < keys.length; j++) {
      let key = keys[j]
      if (!result[key]) result[key] = []
      if (result[key].indexOf(item[key]) < 0) result[key].push(item[key])
      values.push(item[key])
    }
    allKeys.push({
      path: values.join(spliter),
      sku: item['skuId'],
    })
  }

  return {
    result,
    items: allKeys,
  }
}

function buildStatusMap(data, keys) {
  const result = {}

  for (let i = 0; i < keys.length; i++) {
    let key = keys[i]
    let items = data[key]

    result[key] = {}

    for (let j = 0; j < items.length; j++) {
      result[key][items[j]] = [false, false]
    }
  }

  return result
}

function getAllKeys(arr) {
  const result = []
  for (let i = 0; i < arr.length; i++) result.push(arr[i].path)
  return result
}

function buildPathMap(items, spliter) {
  const res = {}
  const allKeys = getAllKeys(items)

  for (let i = 0; i < allKeys.length; i++) {
    const curr = allKeys[i]
    const sku = items[i].sku
    const values = curr.split(spliter)

    const allSets = powerset(values)

    // 每个组合的子集
    for (let j = 0; j < allSets.length; j++) {
      const set = allSets[j]
      const key = set.join(spliter)

      if (!res[key]) res[key] = []
      res[key].push(sku)
    }
  }

  return res
}

function getSelectedItem(statusMap) {
  const result = []
  for (let key in statusMap) {
    const curr = statusMap[key]
    let item = ''
    for (let value in curr) {
      if (curr[value][0]) {
        item = value
        break
      }
    }
    result.push(item)
  }
  return result
}

function getSelectedObj(statusMap, nonVal) {
  const result = {}
  for (let key in statusMap) {
    const curr = statusMap[key]
    let item = nonVal
    for (let value in curr) {
      if (curr[value][0]) {
        item = value
        break
      }
    }
    result[key] = item
  }
  return result
}

function updateStatus(spliter, keys, resultMap, pathMap, statusMap, selected) {
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const data = resultMap[key]
    const copy = selected.slice()

    for (let j = 0; j < data.length; j++) {
      const item = data[j]
      if (selected[i] == item) continue
      copy[i] = item
      const curr = trimSpliter(copy.join(spliter), spliter)

      if (pathMap[curr]) {
        statusMap[key][item][1] = false
      } else {
        statusMap[key][item][1] = true
      }
    }
  }
}

module.exports = {
  toObj,
  toSkuObj,
  toSkuList,
  powerset,
  trimSpliter,
  combineAttr,
  getKeys,
  buildStatusMap,
  buildPathMap,
  getSelectedItem,
  updateStatus,
  getSelectedObj,
}
