const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const res = await db.collection('harassment_phones').limit(1).get();
    if (res.data.length > 0) {
      const docId = res.data[0]._id;
      await db.collection('harassment_phones').doc(docId).update({
        data: { phoneMap: {} }
      });
    }
    return { success: true };
  } catch (err) {
    console.error('clearPhone错误:', err);
    return { success: false, error: err.message };
  }
};