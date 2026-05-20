const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()


let cachedPhoneMap = null
let cacheTime = 0
const CACHE_DURATION = 60 * 1000 

exports.main = async (event, context) => {
  const { feature } = event;
  console.log('[queryPhone] 收到查询请求，特征值：', feature)

  try {
    
    const now = Date.now()
    if (cachedPhoneMap && now - cacheTime < CACHE_DURATION) {
      console.log('[queryPhone] 使用缓存数据，跳过读库')
      const isHarass = cachedPhoneMap[feature] && Array.isArray(cachedPhoneMap[feature]) && cachedPhoneMap[feature].length > 0
      return {
        success: true,
        result: isHarass ? '是骚扰电话' : '不是骚扰电话'
      }
    }

    
    console.log('[queryPhone] 缓存过期，读取数据库')
    const res = await db.collection('harassment_phones').limit(1).get()
    
    if (res.data.length === 0) {
      cachedPhoneMap = {}
      cacheTime = now
      return { success: true, result: '不是骚扰电话' }
    }

    const phoneMap = res.data[0].phoneMap || {}
    cachedPhoneMap = phoneMap
    cacheTime = now

    const isHarass = phoneMap[feature] && Array.isArray(phoneMap[feature]) && phoneMap[feature].length > 0
    return {
      success: true,
      result: isHarass ? '是骚扰电话' : '不是骚扰电话'
    }

  } catch (err) {
    console.error('[queryPhone] 执行报错：', err)
    return {
      success: false,
      error: err.message || '云函数执行异常',
      result: '查询失败'
    }
  }
}