const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloudbase-3g08u0up52b48543' })
const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const { feature } = event

    if (!feature) {
      return { success: true, result: '不是骚扰电话' }
    }

    // 只查询需要的那个字段，不读整个文档
    const res = await db.collection('harassment_phones')
      .limit(1)
      .field({
        [`phoneMap.${feature}`]: true
      })
      .get()

    if (res.data.length === 0) {
      return { success: true, result: '不是骚扰电话' }
    }

    const phoneMap = res.data[0].phoneMap || {}
    const list = phoneMap[feature]
    const isHarass = Array.isArray(list) && list.length > 0

    return {
      success: true,
      result: isHarass ? '是骚扰电话' : '不是骚扰电话'
    }

  } catch (err) {
    return {
      success: false,
      error: err.message
    }
  }
}
