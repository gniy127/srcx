const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { feature } = event
  console.log('[queryPhone] 收到查询请求，特征值：', feature)

  // 校验格式：和你前端的8位数字（前3+后5）对齐
  if (!feature || feature.length !== 8 || !/^\d{8}$/.test(feature)) {
    return { success: false, error: '请输入正确的8位数字格式' }
  }

  try {
    // 关键：用聚合查询，在数据库服务器端直接判断key是否存在，不读取全表数据
    const res = await db.collection('harassment_phones')
      .aggregate()
      // 匹配 phoneMap 中包含当前 feature 作为key的记录
      .match({
        [`phoneMap.${feature}`]: { $exists: true }
      })
      .limit(1)
      .end()

    // 如果聚合查询返回了数据，说明存在该特征值
    const isHarassment = res.list.length > 0
    return {
      success: true,
      result: isHarassment ? '是骚扰电话' : '不是骚扰电话'
    }
  } catch (err) {
    console.error('[queryPhone] 执行报错：', err)
    return {
      success: false,
      error: '查询异常：' + err.message,
      result: '查询失败'
    }
  }
}
