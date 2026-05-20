const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 将对象按 chunkSize 拆分
function chunkObject(obj, chunkSize) {
  const entries = Object.entries(obj);
  const chunks = [];
  for (let i = 0; i < entries.length; i += chunkSize) {
    chunks.push(Object.fromEntries(entries.slice(i, i + chunkSize)));
  }
  return chunks;
}

exports.main = async (event, context) => {
  const { addMap } = event;
  if (!addMap || Object.keys(addMap).length === 0) {
    return { success: true, msg: '无新增数据' };
  }

  try {
    const res = await db.collection('harassment_phones').limit(1).get();

    if (res.data.length === 0) {
      // 首次写入直接 add
      await db.collection('harassment_phones').add({
        data: { phoneMap: addMap, updateTime: db.serverDate() }
      });
    } else {
      const docId = res.data[0]._id;

      // 拆分 addMap，每批最多 500 个特征值
      const chunks = chunkObject(addMap, 500);

      for (const chunk of chunks) {
        const updateObj = {};
        for (const feature in chunk) {
          updateObj[`phoneMap.${feature}`] = _.push(chunk[feature]);
        }
        await db.collection('harassment_phones').doc(docId).update({
          data: {
            ...updateObj,
            updateTime: db.serverDate()
          }
        });
      }
    }

    return { success: true };
  } catch (err) {
    console.error('importPhone错误：', err);
    return { success: false, error: err.message };
  }
};