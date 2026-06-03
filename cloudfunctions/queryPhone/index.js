const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event, context) => {
  try {
    // 仅验证是否能收到前端的phone参数，直接返回结果
    const targetPhone = event.phone;
    if (!targetPhone || targetPhone.length !== 11) {
      return { success: false, result: '请输入11位手机号' };
    }
    // 模拟结果：输入13006500087返回“是骚扰电话”，其他返回“不是”
    const isHarass = targetPhone === '13006500087';
    return {
      success: true,
      result: isHarass ? '是骚扰电话' : '不是骚扰电话'
    };
  } catch (err) {
    console.error('异常：', err);
    return { success: false, result: '查询失败' };
  }
}
